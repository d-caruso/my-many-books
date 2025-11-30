// ================================================================
// src/services/user/UserService.ts
// Business logic layer for user operations
// ================================================================

import { inject, injectable } from 'inversify';
import { TYPES } from '../../container/types';
import { IUserRepository } from '../../repositories/user/IUserRepository';
import {
  PaginatedResult,
  UserEntity,
  UserListOptions,
  UserUpdateInput,
} from '../../repositories/user/UserRepository.types';
import { UserCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import { USER_ROLES } from '@my-many-books/shared-auth';

export type UserServiceErrorCode =
  | 'USER_NOT_FOUND'
  | 'EMAIL_EXISTS'
  | 'FORBIDDEN'
  | 'INVALID_ROLE';

export class UserServiceError extends Error {
  constructor(
    public readonly code: UserServiceErrorCode,
    message?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message ?? code);
  }
}

export interface UserAdminContext {
  userId: number;
  role?: string;
}

export interface CreateUserInput extends Omit<UserCreationAttributes, 'id'> {}

export interface UpdateUserInput extends Partial<CreateUserInput> {}

@injectable()
class UserService {
  constructor(@inject(TYPES.UserRepository) private readonly userRepository: IUserRepository) {}

  initializeControllerContext(): void {
    void this.userRepository;
  }

  async listUsers(options: UserListOptions = {}): Promise<PaginatedResult<UserEntity>> {
    return this.userRepository.list(options);
  }

  async getUserById(id: number): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserServiceError('USER_NOT_FOUND');
    }
    return user;
  }

  async createUser(input: CreateUserInput): Promise<UserEntity> {
    await this.ensureEmailUnique(input.email);
    return this.userRepository.create(input);
  }

  async updateUser(id: number, input: UpdateUserInput, context: UserAdminContext): Promise<UserEntity> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new UserServiceError('USER_NOT_FOUND');
    }

    this.ensureAdminPrivileges(context);

    if (input.email && input.email !== existing.email) {
      await this.ensureEmailUnique(input.email);
    }

    if (input.role && !Object.values(USER_ROLES).includes(input.role)) {
      throw new UserServiceError('INVALID_ROLE');
    }

    const payload: UserUpdateInput = {};

    if (input.email !== undefined) payload.email = input.email;
    if (input.role !== undefined) payload.role = input.role;
    if (input.isActive !== undefined) payload.isActive = input.isActive;

    const updated = await this.userRepository.update(id, payload);
    if (!updated) {
      throw new UserServiceError('USER_NOT_FOUND');
    }

    return updated;
  }

  async deleteUser(id: number, context: UserAdminContext): Promise<void> {
    this.ensureAdminPrivileges(context);

    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new UserServiceError('USER_NOT_FOUND');
    }

    const deleted = await this.userRepository.delete(id);
    if (!deleted) {
      throw new UserServiceError('USER_NOT_FOUND');
    }
  }

  private async ensureEmailUnique(email: string): Promise<void> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new UserServiceError('EMAIL_EXISTS');
    }
  }

  private ensureAdminPrivileges(context: UserAdminContext): void {
    if (context.role !== USER_ROLES.ADMIN) {
      throw new UserServiceError('FORBIDDEN');
    }
  }
}

export { UserService };
