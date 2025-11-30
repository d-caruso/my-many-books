// ================================================================
// src/services/user/UserService.ts
// Business logic layer for user self-service operations
// ================================================================

import { inject, injectable } from 'inversify';
import { USER_ROLES } from '@my-many-books/shared-auth';
import { TYPES } from '../../container/types';
import { IUserRepository } from '../../repositories/user/IUserRepository';
import { UserEntity, UserUpdateInput } from '../../repositories/user/UserRepository.types';
import { IBookRepository } from '../../repositories/book/IBookRepository';
import { BookEntity, BookListOptions, PaginatedResult as BookPaginatedResult } from '../../repositories/book/BookRepositoryTypes';
import { ApplicationError } from '../../errors/ApplicationError';
import { UserCreationAttributes, BookStatus } from '@/models/interfaces/ModelInterfaces';
import { BOOK_STATUS } from '../../utils/constants';

export type UserServiceErrorCode = 'USER_NOT_FOUND';

export class UserServiceError extends ApplicationError {
  constructor(code: UserServiceErrorCode, message?: string) {
    super(message ?? code, code === 'USER_NOT_FOUND' ? 404 : 400, code);
  }
}

export interface ProviderUserInput {
  email: string;
  name?: string | null;
  surname?: string | null;
}

export interface UpdateUserProfileInput {
  name: string;
  surname: string;
}

export interface UserBooksOptions {
  limit?: number;
  offset?: number;
  status?: BookStatus;
}

export interface UserStatsResult {
  totalBooks: number;
  booksByStatus: {
    reading: number;
    paused: number;
    finished: number;
    unspecified: number;
  };
  completionRate: number;
  recentBooks: Array<{ id: number; title: string; addedAt?: Date }>;
}

@injectable()
export class UserService {
  constructor(
    @inject(TYPES.UserRepository) private readonly userRepository: IUserRepository,
    @inject(TYPES.BookRepository) private readonly bookRepository: IBookRepository
  ) {}

  initializeControllerContext(): void {
    void this.userRepository;
    void this.bookRepository;
  }

  async findOrCreateUser(
    providerUser: ProviderUserInput,
    _provider: string
  ): Promise<{ user: UserEntity; isNewUser: boolean }> {
    const existing = await this.userRepository.findByEmail(providerUser.email);
    if (existing) {
      return { user: existing, isNewUser: false };
    }

    const payload: UserCreationAttributes = {
      email: providerUser.email,
      name: providerUser.name?.trim() || 'Unknown',
      surname: providerUser.surname?.trim() || 'User',
      isActive: true,
      role: USER_ROLES.USER,
    };

    const created = await this.userRepository.create(payload);
    return { user: created, isNewUser: true };
  }

  async getUserById(userId: number): Promise<UserEntity | null> {
    return this.userRepository.findById(userId);
  }

  async requireUser(userId: number): Promise<UserEntity> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new UserServiceError('USER_NOT_FOUND');
    }
    return user;
  }

  async updateCurrentUser(userId: number, input: UpdateUserProfileInput): Promise<UserEntity> {
    const payload: UserUpdateInput = {
      name: input.name,
      surname: input.surname,
    };

    const updated = await this.userRepository.update(userId, payload);
    if (!updated) {
      throw new UserServiceError('USER_NOT_FOUND');
    }

    return updated;
  }

  async listUserBooks(
    userId: number,
    options: UserBooksOptions = {}
  ): Promise<BookPaginatedResult<BookEntity>> {
    const listOptions: BookListOptions = {};

    if (options.limit !== undefined) {
      listOptions.limit = options.limit;
    }
    if (options.offset !== undefined) {
      listOptions.offset = options.offset;
    }

    if (options.status) {
      listOptions.filters = { status: options.status };
    }

    return this.bookRepository.listUserBooks(userId, listOptions);
  }

  async getUserStats(userId: number): Promise<UserStatsResult> {
    const [totalBooks, readingBooks, pausedBooks, finishedBooks, recentBooks] = await Promise.all([
      this.bookRepository.countUserBooks(userId),
      this.bookRepository.countUserBooks(userId, BOOK_STATUS.READING as BookStatus),
      this.bookRepository.countUserBooks(userId, BOOK_STATUS.PAUSED as BookStatus),
      this.bookRepository.countUserBooks(userId, BOOK_STATUS.FINISHED as BookStatus),
      this.bookRepository.findRecentUserBooks(userId, 5),
    ]);

    const unspecified =
      totalBooks - readingBooks - pausedBooks - finishedBooks > 0
        ? totalBooks - readingBooks - pausedBooks - finishedBooks
        : 0;

    const completionRate =
      totalBooks > 0 ? Math.round((finishedBooks / totalBooks) * 100) : 0;

    return {
      totalBooks,
      booksByStatus: {
        reading: readingBooks,
        paused: pausedBooks,
        finished: finishedBooks,
        unspecified,
      },
      completionRate,
      recentBooks: recentBooks.map(book => ({
        id: book.id,
        title: book.title,
        addedAt: book.creationDate,
      })),
    };
  }

  async deactivateAccount(userId: number): Promise<void> {
    const updated = await this.userRepository.update(userId, { isActive: false });
    if (!updated) {
      throw new UserServiceError('USER_NOT_FOUND');
    }
  }

  async deleteAccount(userId: number): Promise<void> {
    const deleted = await this.userRepository.delete(userId);
    if (!deleted) {
      throw new UserServiceError('USER_NOT_FOUND');
    }
  }
}
