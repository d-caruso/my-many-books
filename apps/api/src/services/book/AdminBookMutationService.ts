import { inject, injectable } from 'inversify';
import { USER_ROLES } from '@my-many-books/shared-auth';
import { TYPES } from '../../container/types';
import { ApplicationError } from '../../errors/ApplicationError';
import { User } from '../../models/User';
import type { BookEntity } from '../../repositories/book/BookRepositoryTypes';
import type { Repository as BookRepositoryContract } from '../../repositories/book/Repository';
import { EVENTS } from '../hooks/events';
import { emitHookEvent } from '../hooks/hookSystem';

export interface AdminBookMutationContext {
  userId: number;
  role?: string;
}

export interface AdminUpdateBookInput {
  title?: string;
  isbnCode?: string;
  editionNumber?: number | null;
  editionDate?: string | null;
  status?: 'reading' | 'paused' | 'finished' | null;
  notes?: string | null;
  userId?: number | null;
}

type AdminBookMutationErrorCode = 'BOOK_NOT_FOUND' | 'USER_NOT_FOUND' | 'FORBIDDEN';

const errorStatusMap: Record<AdminBookMutationErrorCode, number> = {
  BOOK_NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  FORBIDDEN: 403,
};

export class AdminBookMutationServiceError extends ApplicationError {
  constructor(
    override readonly code: AdminBookMutationErrorCode,
    message?: string,
    override readonly details?: Record<string, unknown>
  ) {
    super(message ?? code, errorStatusMap[code] ?? 400, code, details);
  }
}

@injectable()
export class AdminBookMutationService {
  constructor(
    @inject(TYPES.BookRepository) private readonly bookRepository: BookRepositoryContract
  ) {}

  async updateBook(
    bookId: number,
    input: AdminUpdateBookInput,
    context: AdminBookMutationContext | null
  ): Promise<BookEntity> {
    const admin = this.mapAdminContext(context);
    void emitHookEvent(EVENTS.BOOK.UPDATE.BEFORE, {
      bookId,
      input,
      admin,
    });

    let existing: BookEntity | null = null;

    try {
      this.ensureAdminPrivileges(context);

      existing = await this.bookRepository.findById(bookId);
      if (!existing) {
        throw new AdminBookMutationServiceError('BOOK_NOT_FOUND');
      }

      if (input.userId !== undefined && input.userId !== null) {
        const user = await User.findByPk(input.userId);
        if (!user) {
          throw new AdminBookMutationServiceError('USER_NOT_FOUND');
        }
      }

      const updated = await this.bookRepository.update(bookId, input);
      if (!updated) {
        throw new AdminBookMutationServiceError('BOOK_NOT_FOUND');
      }

      void emitHookEvent(EVENTS.BOOK.UPDATE.AFTER, {
        bookId,
        book: updated,
        previousBook: existing,
        changes: input,
        admin,
      });

      return updated;
    } catch (error) {
      void emitHookEvent(EVENTS.BOOK.UPDATE.FAILURE, {
        bookId,
        book: existing,
        input,
        admin,
        error,
      });
      throw error;
    }
  }

  async deleteBook(
    bookId: number,
    context: AdminBookMutationContext | null
  ): Promise<void> {
    const admin = this.mapAdminContext(context);
    void emitHookEvent(EVENTS.BOOK.DELETE.BEFORE, {
      bookId,
      admin,
    });

    let existing: BookEntity | null = null;

    try {
      this.ensureAdminPrivileges(context);

      existing = await this.bookRepository.findById(bookId);
      if (!existing) {
        throw new AdminBookMutationServiceError('BOOK_NOT_FOUND');
      }

      const deleted = await this.bookRepository.delete(bookId);
      if (!deleted) {
        throw new AdminBookMutationServiceError('BOOK_NOT_FOUND');
      }

      void emitHookEvent(EVENTS.BOOK.DELETE.AFTER, {
        bookId,
        book: existing,
        admin,
      });
    } catch (error) {
      void emitHookEvent(EVENTS.BOOK.DELETE.FAILURE, {
        bookId,
        book: existing,
        admin,
        error,
      });
      throw error;
    }
  }

  private ensureAdminPrivileges(context: AdminBookMutationContext | null): void {
    if (context?.role !== USER_ROLES.ADMIN) {
      throw new AdminBookMutationServiceError('FORBIDDEN');
    }
  }

  private mapAdminContext(
    context: AdminBookMutationContext | null
  ): { id: number; role?: string } | null {
    if (!context) {
      return null;
    }

    const admin: { id: number; role?: string } = {
      id: context.userId,
    };

    if (context.role) {
      admin.role = context.role;
    }

    return admin;
  }
}
