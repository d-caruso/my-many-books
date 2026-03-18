// ================================================================
// src/services/author/AuthorService.ts
// Business logic layer for author operations
// ================================================================

import { inject, injectable } from 'inversify';
import { USER_ROLES } from '@my-many-books/shared-auth';
import { TYPES } from '../../container/types';
import { Repository as AuthorRepositoryContract } from '../../repositories/author/Repository';
import { AuthorEntity } from '../../repositories/author/AuthorRepositoryTypes';
import { AuthorCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import { ApplicationError } from '../../errors/ApplicationError';
import { emitHookEvent } from '../hooks/hookSystem';
import { EVENTS } from '../hooks/events';

export type AuthorServiceErrorCode =
  | 'AUTHOR_NOT_FOUND'
  | 'DUPLICATE_AUTHOR'
  | 'FORBIDDEN'
  | 'AUTHOR_HAS_BOOKS';

const authorErrorStatus: Record<AuthorServiceErrorCode, number> = {
  AUTHOR_NOT_FOUND: 404,
  DUPLICATE_AUTHOR: 409,
  FORBIDDEN: 403,
  AUTHOR_HAS_BOOKS: 409,
};

export class AuthorServiceError extends ApplicationError {
  constructor(
    override readonly code: AuthorServiceErrorCode,
    message?: string,
    override readonly details?: Record<string, unknown>
  ) {
    super(message ?? code, authorErrorStatus[code] ?? 400, code, details);
  }
}

export interface AuthorUserContext {
  userId: number;
  role?: string;
}

export interface CreateAuthorInput {
  name: string;
  surname: string;
  nationality?: string | null;
  userId?: number;
}

export type UpdateAuthorInput = Partial<CreateAuthorInput>;

@injectable()
class AuthorService {
  constructor(
    @inject(TYPES.AuthorRepository)
    private readonly authorRepository: AuthorRepositoryContract
  ) {}

  initializeControllerContext(): void {
    void this.authorRepository;
  }

  async createAuthor(
    input: CreateAuthorInput,
    userContext: AuthorUserContext
  ): Promise<AuthorEntity> {
    const user = this.mapEventUser(userContext);
    await this.emitAuthorEvent(EVENTS.AUTHOR.CREATE.BEFORE, {
      user,
      input,
    });

    try {
      const ownerId = this.resolveOwnerId(input.userId, userContext);
      await this.ensureUniqueName(input.name, input.surname, ownerId);

      const payload: AuthorCreationAttributes = {
        name: input.name,
        surname: input.surname,
        nationality: input.nationality ?? null,
        userId: ownerId,
      };

      const createdAuthor = await this.authorRepository.create(payload);
      await this.emitAuthorEvent(EVENTS.AUTHOR.CREATE.AFTER, {
        author: createdAuthor,
        user,
        input,
      });
      return createdAuthor;
    } catch (error) {
      await this.emitAuthorEvent(EVENTS.AUTHOR.CREATE.FAILURE, {
        user,
        input,
        error,
      });
      throw error;
    }
  }

  async updateAuthor(
    id: number,
    input: UpdateAuthorInput,
    userContext: AuthorUserContext
  ): Promise<AuthorEntity> {
    const user = this.mapEventUser(userContext);
    await this.emitAuthorEvent(EVENTS.AUTHOR.UPDATE.BEFORE, {
      authorId: id,
      user,
      input,
    });

    try {
      const existing = await this.authorRepository.findById(id);
      if (!existing) {
        throw new AuthorServiceError('AUTHOR_NOT_FOUND');
      }

      this.ensureOwnership(existing, userContext);

      const nextName = input.name ?? existing.name;
      const nextSurname = input.surname ?? existing.surname;
      if (nextName !== existing.name || nextSurname !== existing.surname) {
        await this.ensureUniqueName(nextName, nextSurname, existing.userId);
      }

      const payload: Partial<AuthorCreationAttributes> = {};

      if (input.name !== undefined) {
        payload.name = input.name;
      }

      if (input.surname !== undefined) {
        payload.surname = input.surname;
      }

      if (input.nationality !== undefined) {
        payload.nationality = input.nationality;
      }

      const updated = await this.authorRepository.update(id, payload);
      if (!updated) {
        throw new AuthorServiceError('AUTHOR_NOT_FOUND');
      }
      await this.emitAuthorEvent(EVENTS.AUTHOR.UPDATE.AFTER, {
        authorId: id,
        author: updated,
        user,
        changes: input,
      });

      return updated;
    } catch (error) {
      await this.emitAuthorEvent(EVENTS.AUTHOR.UPDATE.FAILURE, {
        authorId: id,
        user,
        input,
        error,
      });
      throw error;
    }
  }

  async deleteAuthor(id: number, userContext: AuthorUserContext, force?: boolean): Promise<void> {
    const user = this.mapEventUser(userContext);
    const forceDelete = force ?? false;
    await this.emitAuthorEvent(EVENTS.AUTHOR.DELETE.BEFORE, {
      authorId: id,
      user,
      force: forceDelete,
    });

    let existing: AuthorEntity | null = null;

    try {
      existing = await this.authorRepository.findById(id);
      if (!existing) {
        throw new AuthorServiceError('AUTHOR_NOT_FOUND');
      }

      this.ensureOwnership(existing, userContext);

      const bookCount = await this.authorRepository.countBooks(id);
      if (bookCount > 0 && !forceDelete) {
        throw new AuthorServiceError('AUTHOR_HAS_BOOKS');
      }

      const deleted = await this.authorRepository.delete(id);
      if (!deleted) {
        throw new AuthorServiceError('AUTHOR_NOT_FOUND');
      }

      await this.emitAuthorEvent(EVENTS.AUTHOR.DELETE.AFTER, {
        authorId: id,
        author: existing,
        user,
      });
    } catch (error) {
      await this.emitAuthorEvent(EVENTS.AUTHOR.DELETE.FAILURE, {
        authorId: id,
        author: existing,
        user,
        force: forceDelete,
        error,
      });
      throw error;
    }
  }

  // ===== helpers ==========================================================

  private async emitAuthorEvent(
    eventName: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    await emitHookEvent(eventName, payload);
  }

  private mapEventUser(
    userContext?: AuthorUserContext | null
  ): { id: number; role?: string } | null {
    if (!userContext) {
      return null;
    }

    const summary: { id: number; role?: string } = {
      id: userContext.userId,
    };
    if (userContext.role) {
      summary.role = userContext.role;
    }
    return summary;
  }

  private resolveOwnerId(inputUserId: number | undefined, userContext: AuthorUserContext): number {
    if (inputUserId !== undefined) {
      if (userContext.role === USER_ROLES.ADMIN) {
        return inputUserId;
      }
      if (inputUserId !== userContext.userId) {
        throw new AuthorServiceError('FORBIDDEN');
      }
      return inputUserId;
    }

    return userContext.userId;
  }

  private async ensureUniqueName(name: string, surname: string, userId: number): Promise<void> {
    const existing = await this.authorRepository.findByNameAndSurname(name, surname, userId);
    if (existing) {
      throw new AuthorServiceError('DUPLICATE_AUTHOR');
    }
  }

  private ensureOwnership(author: AuthorEntity, userContext: AuthorUserContext): void {
    if (!userContext) {
      throw new AuthorServiceError('FORBIDDEN');
    }

    if (userContext.role === USER_ROLES.ADMIN) {
      return;
    }

    if (author.userId !== userContext.userId) {
      throw new AuthorServiceError('FORBIDDEN');
    }
  }
}

export { AuthorService };
