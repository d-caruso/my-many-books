// ================================================================
// src/services/author/AuthorService.ts
// Business logic layer for author operations
// ================================================================

import { inject, injectable } from 'inversify';
import { USER_ROLES } from '@my-many-books/shared-auth';
import { TYPES } from '../../container/types';
import { IAuthorRepository } from '../../repositories/author/IAuthorRepository';
import { AuthorEntity } from '../../repositories/author/AuthorRepositoryTypes';
import { AuthorCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import { ApplicationError } from '../../errors/ApplicationError';

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
    @inject(TYPES.AuthorRepository) private readonly authorRepository: IAuthorRepository
  ) {}

  initializeControllerContext(): void {
    void this.authorRepository;
  }

  async createAuthor(
    input: CreateAuthorInput,
    userContext: AuthorUserContext
  ): Promise<AuthorEntity> {
    const ownerId = this.resolveOwnerId(input.userId, userContext);
    await this.ensureUniqueName(input.name, input.surname, ownerId);

    const payload: AuthorCreationAttributes = {
      name: input.name,
      surname: input.surname,
      nationality: input.nationality ?? null,
      userId: ownerId,
    };

    return this.authorRepository.create(payload);
  }

  async updateAuthor(
    id: number,
    input: UpdateAuthorInput,
    userContext: AuthorUserContext
  ): Promise<AuthorEntity> {
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
    return updated;
  }

  async deleteAuthor(id: number, userContext: AuthorUserContext): Promise<void> {
    const existing = await this.authorRepository.findById(id);
    if (!existing) {
      throw new AuthorServiceError('AUTHOR_NOT_FOUND');
    }

    this.ensureOwnership(existing, userContext);

    const bookCount = await this.authorRepository.countBooks(id);
    if (bookCount > 0) {
      throw new AuthorServiceError('AUTHOR_HAS_BOOKS');
    }

    const deleted = await this.authorRepository.delete(id);
    if (!deleted) {
      throw new AuthorServiceError('AUTHOR_NOT_FOUND');
    }
  }

  // ===== helpers ==========================================================

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
