// ================================================================
// src/services/user/UserService.ts
// Business logic layer for user operations
// ================================================================

import { inject, injectable } from 'inversify';
import { TYPES } from '../../container/types';
import { Repository as UserRepositoryContract } from '../../repositories/user/Repository';
import {
  PaginatedResult,
  UserEntity,
  UserListOptions,
  UserUpdateInput,
} from '../../repositories/user/UserRepositoryTypes';
import { UserCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import { USER_ROLES } from '@my-many-books/shared-auth';
import { ApplicationError } from '../../errors/ApplicationError';
import { EVENTS } from '../hooks/events';
import { emitHookEvent } from '../hooks/hookSystem';

export type UserServiceErrorCode =
  | 'USER_NOT_FOUND'
  | 'EMAIL_EXISTS'
  | 'FORBIDDEN'
  | 'INVALID_ROLE'
  | 'LAST_ADMIN';

const statusMap: Record<UserServiceErrorCode, number> = {
  USER_NOT_FOUND: 404,
  EMAIL_EXISTS: 409,
  FORBIDDEN: 403,
  INVALID_ROLE: 400,
  LAST_ADMIN: 400,
};

export class AdminUserServiceError extends ApplicationError {
  constructor(
    override readonly code: UserServiceErrorCode,
    message?: string,
    override readonly details?: Record<string, unknown>
  ) {
    super(message ?? code, statusMap[code] ?? 400, code, details);
  }
}

export interface UserAdminContext {
  userId: number;
  role?: string;
}

export type CreateUserInput = Omit<UserCreationAttributes, 'id'>;

export type UpdateUserInput = Partial<CreateUserInput>;

type UserRoleEventBranch = {
  BEFORE: string;
  AFTER: string;
  FAILURE: string;
};

@injectable()
class AdminUserService {
  constructor(
    @inject(TYPES.AdminUserRepository) private readonly userRepository: UserRepositoryContract
  ) {}

  initializeControllerContext(): void {
    void this.userRepository;
  }

  async listUsers(options: UserListOptions = {}): Promise<PaginatedResult<UserEntity>> {
    return this.userRepository.list(options);
  }

  async getUserById(id: number): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AdminUserServiceError('USER_NOT_FOUND');
    }
    return user;
  }

  async createUser(input: CreateUserInput): Promise<UserEntity> {
    await this.ensureEmailUnique(input.email);
    return this.userRepository.create(input);
  }

  async updateUser(
    id: number,
    input: UpdateUserInput,
    context: UserAdminContext
  ): Promise<UserEntity> {
    const admin = this.mapAdminContext(context);
    await this.emitAdminUserEvent(EVENTS.USER.UPDATE.BEFORE, {
      userId: id,
      input,
      admin,
    });

    let existing: UserEntity | null = null;
    let roleEventBranch: UserRoleEventBranch | null = null;

    try {
      existing = await this.userRepository.findById(id);
      if (!existing) {
        throw new AdminUserServiceError('USER_NOT_FOUND');
      }

      this.ensureAdminPrivileges(context);

      if (input.email && input.email !== existing.email) {
        await this.ensureEmailUnique(input.email);
      }

      if (input.role && !Object.values(USER_ROLES).includes(input.role)) {
        throw new AdminUserServiceError('INVALID_ROLE');
      }

      roleEventBranch = this.resolveRoleEventBranch(existing.role, input.role);
      if (roleEventBranch) {
        await this.emitAdminUserEvent(roleEventBranch.BEFORE, {
          userId: id,
          user: existing,
          previousRole: existing.role ?? null,
          nextRole: input.role ?? null,
          admin,
        });
      }

      const payload: UserUpdateInput = {};

      if (input.email !== undefined) payload.email = input.email;
      if (input.role !== undefined) payload.role = input.role;
      if (input.isActive !== undefined) payload.isActive = input.isActive;

      const updated = await this.userRepository.update(id, payload);
      if (!updated) {
        throw new AdminUserServiceError('USER_NOT_FOUND');
      }

      await this.emitAdminUserEvent(EVENTS.USER.UPDATE.AFTER, {
        userId: id,
        user: updated,
        changes: input,
        admin,
      });

      if (roleEventBranch) {
        await this.emitAdminUserEvent(roleEventBranch.AFTER, {
          userId: id,
          user: updated,
          previousRole: existing.role ?? null,
          newRole: updated.role ?? null,
          admin,
        });
      }

      return updated;
    } catch (error) {
      await this.emitAdminUserEvent(EVENTS.USER.UPDATE.FAILURE, {
        userId: id,
        user: existing,
        input,
        admin,
        error,
      });

      if (roleEventBranch) {
        await this.emitAdminUserEvent(roleEventBranch.FAILURE, {
          userId: id,
          user: existing,
          previousRole: existing?.role ?? null,
          nextRole: input.role ?? null,
          input,
          admin,
          error,
        });
      }

      throw error;
    }
  }

  async deleteUser(id: number, context: UserAdminContext): Promise<void> {
    const admin = this.mapAdminContext(context);
    await this.emitAdminUserEvent(EVENTS.USER.DELETE.BEFORE, {
      userId: id,
      admin,
    });

    let existing: UserEntity | null = null;

    try {
      this.ensureAdminPrivileges(context);

      existing = await this.userRepository.findById(id);
      if (!existing) {
        throw new AdminUserServiceError('USER_NOT_FOUND');
      }

      if (existing.role === USER_ROLES.ADMIN) {
        const adminCount = await this.userRepository.countByRole(USER_ROLES.ADMIN);
        if (adminCount <= 1) {
          throw new AdminUserServiceError('LAST_ADMIN');
        }
      }

      const deleted = await this.userRepository.delete(id);
      if (!deleted) {
        throw new AdminUserServiceError('USER_NOT_FOUND');
      }

      await this.emitAdminUserEvent(EVENTS.USER.DELETE.AFTER, {
        userId: id,
        user: existing,
        admin,
      });
    } catch (error) {
      await this.emitAdminUserEvent(EVENTS.USER.DELETE.FAILURE, {
        userId: id,
        user: existing,
        admin,
        error,
      });
      throw error;
    }
  }

  private async ensureEmailUnique(email: string): Promise<void> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new AdminUserServiceError('EMAIL_EXISTS');
    }
  }

  private ensureAdminPrivileges(context: UserAdminContext): void {
    if (context.role !== USER_ROLES.ADMIN) {
      throw new AdminUserServiceError('FORBIDDEN');
    }
  }

  private async emitAdminUserEvent(
    eventName: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    await emitHookEvent(eventName, payload);
  }

  private mapAdminContext(
    context: UserAdminContext
  ): { id: number; role?: string } {
    const admin: { id: number; role?: string } = {
      id: context.userId,
    };

    if (context.role) {
      admin.role = context.role;
    }

    return admin;
  }

  private resolveRoleEventBranch(
    previousRole: string | undefined,
    nextRole: string | undefined
  ): UserRoleEventBranch | null {
    if (nextRole === undefined || nextRole === previousRole) {
      return null;
    }

    if (!previousRole) {
      return EVENTS.USER.ROLE.ADD;
    }

    if (!nextRole) {
      return EVENTS.USER.ROLE.DELETE;
    }

    return EVENTS.USER.ROLE.CHANGE;
  }
}

export { AdminUserService };
