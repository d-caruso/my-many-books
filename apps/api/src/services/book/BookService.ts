// ================================================================
// src/services/book/BookService.ts
// Business logic layer for book operations
// ================================================================

import { UniqueConstraintError } from 'sequelize';
import { inject, injectable } from 'inversify';
import { USER_ROLES } from '@my-many-books/shared-auth';
import { TYPES } from '../../container/types';
import { Repository as BookRepositoryContract } from '../../repositories/book/Repository';
import { BookAssociationInput, BookEntity } from '../../repositories/book/BookRepositoryTypes';
import { BookCreationAttributes, BookStatus } from '@/models/interfaces/ModelInterfaces';
import { Author } from '@/models/Author';
import { Category } from '@/models/Category';
import { ApplicationError } from '../../errors/ApplicationError';
import { emitHookEvent } from '../hooks/hookSystem';
import { EVENTS } from '../hooks/events';

export type BookServiceErrorCode =
  | 'BOOK_NOT_FOUND'
  | 'ISBN_EXISTS'
  | 'FORBIDDEN'
  | 'INVALID_AUTHOR_IDS'
  | 'INVALID_CATEGORY_IDS';

const bookErrorStatus: Record<BookServiceErrorCode, number> = {
  BOOK_NOT_FOUND: 404,
  ISBN_EXISTS: 409,
  FORBIDDEN: 403,
  INVALID_AUTHOR_IDS: 400,
  INVALID_CATEGORY_IDS: 400,
};

export class BookServiceError extends ApplicationError {
  constructor(
    override readonly code: BookServiceErrorCode,
    message?: string,
    override readonly details?: Record<string, unknown>
  ) {
    super(message ?? code, bookErrorStatus[code] ?? 400, code, details);
  }
}

export interface BookUserContext {
  userId: number;
  role?: string;
}

export interface CreateBookInput {
  isbnCode: string;
  title: string;
  editionNumber?: number;
  editionDate?: string | null;
  status?: BookStatus;
  notes?: string;
  authorIds?: number[];
  categoryIds?: number[];
  userId?: number;
  coverImageUrlMedium?: string | null;
  coverImageUrlLarge?: string | null;
}

export type UpdateBookInput = Partial<CreateBookInput>;

@injectable()
class BookService {
  constructor(
    @inject(TYPES.BookRepository) private readonly bookRepository: BookRepositoryContract
  ) {}

  initializeControllerContext(): void {
    // Accessing the repository ensures the binding is evaluated.
    void this.bookRepository;
  }

  async createBook(
    input: CreateBookInput,
    userContext?: BookUserContext | null
  ): Promise<BookEntity> {
    const user = this.mapEventUser(userContext);
    void emitHookEvent(EVENTS.BOOK.CREATE.BEFORE, {
      user,
      input,
    });

    try {
      const ownerId = this.resolveOwnerId(input.userId, userContext);
      await this.ensureIsbnUnique(input.isbnCode, ownerId);
      await this.validateAssociations(ownerId, input.authorIds, input.categoryIds);

      const associations = this.extractAssociations(input);
      const payload = this.normalizePayload({ ...input, userId: ownerId });

      const createdBook = await this.bookRepository.create(payload, associations);
      void emitHookEvent(EVENTS.BOOK.CREATE.AFTER, {
        book: createdBook,
        user,
        input,
      });
      return createdBook;
    } catch (error) {
      void emitHookEvent(EVENTS.BOOK.CREATE.FAILURE, {
        user,
        input,
        error,
      });
      throw error;
    }
  }

  async updateBook(
    bookId: number,
    input: UpdateBookInput,
    userContext: BookUserContext
  ): Promise<BookEntity> {
    const user = this.mapEventUser(userContext);
    void emitHookEvent(EVENTS.BOOK.UPDATE.BEFORE, {
      bookId,
      user,
      input,
    });

    let book: BookEntity | null = null;
    let statusWillChange = false;

    try {
      book = await this.bookRepository.findById(bookId);
      if (!book) {
        throw new BookServiceError('BOOK_NOT_FOUND');
      }

      this.ensureOwnership(book, userContext);

      if (input.isbnCode && input.isbnCode !== book.isbnCode) {
        await this.ensureIsbnUnique(input.isbnCode, book.userId);
      }

      await this.validateAssociations(book.userId, input.authorIds, input.categoryIds);

      const associations = this.extractAssociations(input);
      statusWillChange = input.status !== undefined && input.status !== book.status;

      if (statusWillChange) {
        void emitHookEvent(EVENTS.BOOK.STATUS.CHANGE.BEFORE, {
          bookId,
          previousStatus: book.status ?? null,
          nextStatus: input.status ?? null,
          book,
          user,
          changes: input,
        });
      }

      const payload = this.normalizePartialPayload(input);

      const updated = await this.bookRepository.update(bookId, payload, associations);
      if (!updated) {
        throw new BookServiceError('BOOK_NOT_FOUND');
      }

      void emitHookEvent(EVENTS.BOOK.UPDATE.AFTER, {
        bookId,
        book: updated,
        user,
        changes: input,
      });

      if (book.status !== updated.status) {
        void emitHookEvent(EVENTS.BOOK.STATUS.CHANGE.AFTER, {
          bookId,
          previousStatus: book.status ?? null,
          newStatus: updated.status ?? null,
          book: updated,
          user,
        });
      }

      return updated;
    } catch (error) {
      void emitHookEvent(EVENTS.BOOK.UPDATE.FAILURE, {
        bookId,
        user,
        input,
        error,
      });

      if (statusWillChange && book) {
        void emitHookEvent(EVENTS.BOOK.STATUS.CHANGE.FAILURE, {
          bookId,
          previousStatus: book.status ?? null,
          nextStatus: input.status ?? null,
          book,
          user,
          changes: input,
          error,
        });
      }

      throw error;
    }
  }

  async deleteBook(bookId: number, userContext: BookUserContext): Promise<void> {
    const user = this.mapEventUser(userContext);
    void emitHookEvent(EVENTS.BOOK.DELETE.BEFORE, {
      bookId,
      user,
    });

    let book: BookEntity | null = null;

    try {
      book = await this.bookRepository.findById(bookId);
      if (!book) {
        throw new BookServiceError('BOOK_NOT_FOUND');
      }

      this.ensureOwnership(book, userContext);

      const deleted = await this.bookRepository.delete(bookId);
      if (!deleted) {
        throw new BookServiceError('BOOK_NOT_FOUND');
      }

      void emitHookEvent(EVENTS.BOOK.DELETE.AFTER, {
        bookId,
        book,
        user,
      });
    } catch (error) {
      void emitHookEvent(EVENTS.BOOK.DELETE.FAILURE, {
        bookId,
        book,
        user,
        error,
      });
      throw error;
    }
  }

  // ===== helpers ==========================================================

  private mapEventUser(userContext?: BookUserContext | null): { id: number; role?: string } | null {
    if (!userContext) {
      return null;
    }

    const user: { id: number; role?: string } = {
      id: userContext.userId,
    };
    if (userContext.role) {
      user.role = userContext.role;
    }
    return user;
  }

  private resolveOwnerId(
    inputUserId: number | undefined,
    userContext?: BookUserContext | null
  ): number {
    if (inputUserId !== undefined) {
      if (userContext && userContext.role === USER_ROLES.ADMIN) {
        return inputUserId;
      }
      if (userContext && inputUserId === userContext.userId) {
        return inputUserId;
      }
      throw new BookServiceError('FORBIDDEN');
    }

    if (userContext?.userId) {
      return userContext.userId;
    }

    throw new BookServiceError('FORBIDDEN');
  }

  private async ensureIsbnUnique(isbnCode: string, userId?: number): Promise<void> {
    const existing = await this.bookRepository.findByIsbnCode(isbnCode, userId);
    if (existing) {
      throw new BookServiceError('ISBN_EXISTS');
    }
  }

  private async validateAssociations(
    ownerId: number | undefined,
    authorIds?: number[],
    categoryIds?: number[]
  ): Promise<void> {
    if (authorIds) {
      const normalizedAuthorIds = this.deduplicateIds(authorIds);

      if (normalizedAuthorIds.length === 0) {
        // allow clearing associations
      } else {
        const authors = await Author.findAll({ where: { id: normalizedAuthorIds } });
        if (authors.length !== normalizedAuthorIds.length) {
          throw new BookServiceError('INVALID_AUTHOR_IDS');
        }
        if (
          ownerId !== undefined &&
          authors.some((author) => !this.belongsToOwner(author.userId, ownerId))
        ) {
          throw new BookServiceError('INVALID_AUTHOR_IDS');
        }
      }
    }

    if (categoryIds) {
      const normalizedCategoryIds = this.deduplicateIds(categoryIds);

      if (normalizedCategoryIds.length === 0) {
        // allow clearing associations
      } else {
        const categories = await Category.findAll({ where: { id: normalizedCategoryIds } });
        if (categories.length !== normalizedCategoryIds.length) {
          throw new BookServiceError('INVALID_CATEGORY_IDS');
        }
        if (
          ownerId !== undefined &&
          categories.some((category) => !this.belongsToOwner(category.userId, ownerId))
        ) {
          throw new BookServiceError('INVALID_CATEGORY_IDS');
        }
      }
    }
  }

  private deduplicateIds(ids: number[]): number[] {
    return Array.from(new Set(ids));
  }

  private belongsToOwner(resourceUserId: number | null | undefined, ownerId: number): boolean {
    if (resourceUserId === null || resourceUserId === undefined) {
      return false;
    }

    const normalizedResourceUserId = Number(resourceUserId);
    const normalizedOwnerId = Number(ownerId);

    if (!Number.isFinite(normalizedResourceUserId) || !Number.isFinite(normalizedOwnerId)) {
      return false;
    }

    return normalizedResourceUserId === normalizedOwnerId;
  }

  private extractAssociations(
    input: CreateBookInput | UpdateBookInput
  ): BookAssociationInput | undefined {
    const associationInput: BookAssociationInput = {};

    if (input.authorIds !== undefined) {
      associationInput.authorIds = input.authorIds;
    }

    if (input.categoryIds !== undefined) {
      associationInput.categoryIds = input.categoryIds;
    }

    return Object.keys(associationInput).length > 0 ? associationInput : undefined;
  }

  private normalizePayload(input: CreateBookInput): BookCreationAttributes {
    return {
      isbnCode: input.isbnCode,
      title: input.title,
      editionNumber: input.editionNumber,
      editionDate: input.editionDate ?? undefined,
      status: input.status,
      notes: input.notes,
      userId: input.userId,
      coverImageUrlMedium: input.coverImageUrlMedium,
      coverImageUrlLarge: input.coverImageUrlLarge,
    };
  }

  private normalizePartialPayload(input: UpdateBookInput): Partial<BookCreationAttributes> {
    const payload: Partial<BookCreationAttributes> = {};

    if (input.title !== undefined) payload.title = input.title;
    if (input.editionNumber !== undefined) payload.editionNumber = input.editionNumber;
    if (input.editionDate !== undefined) {
      payload.editionDate = input.editionDate;
    }
    if (input.status !== undefined) payload.status = input.status;
    if (input.notes !== undefined) payload.notes = input.notes;
    if (input.isbnCode !== undefined) payload.isbnCode = input.isbnCode;
    if (input.coverImageUrlMedium !== undefined) payload.coverImageUrlMedium = input.coverImageUrlMedium;
    if (input.coverImageUrlLarge !== undefined) payload.coverImageUrlLarge = input.coverImageUrlLarge;

    return payload;
  }

  private ensureOwnership(book: BookEntity, userContext?: BookUserContext | null): void {
    if (!userContext) {
      throw new BookServiceError('FORBIDDEN');
    }

    if (userContext.role === USER_ROLES.ADMIN) {
      return;
    }

    if (book.userId !== userContext.userId) {
      throw new BookServiceError('FORBIDDEN');
    }
  }
}

export { BookService };
