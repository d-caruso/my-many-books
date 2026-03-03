// ================================================================
// src/services/user/UserService.ts
// Business logic layer for user self-service operations
// ================================================================

import { inject, injectable } from 'inversify';
import { USER_ROLES } from '@my-many-books/shared-auth';
import { clearUserCache } from '../../middleware/authCache';
import { TYPES } from '../../container/types';
import { Repository as UserRepositoryContract } from '../../repositories/user/Repository';
import { UserEntity, UserUpdateInput } from '../../repositories/user/UserRepositoryTypes';
import { Repository as BookRepositoryContract } from '../../repositories/book/Repository';
import {
  BookEntity,
  BookListOptions,
  PaginatedResult as BookPaginatedResult,
} from '../../repositories/book/BookRepositoryTypes';
import { ApplicationError } from '../../errors/ApplicationError';
import { UserCreationAttributes, BookStatus } from '@/models/interfaces/ModelInterfaces';
import { BOOK_STATUS } from '@my-many-books/shared-types';
import { getLogger } from '@my-many-books/shared-logging';
import { UserOnboardingService } from './UserOnboardingService';
import { UserAuthIdentity } from '../../models/UserAuthIdentity';

export type UserServiceErrorCode = 'USER_NOT_FOUND';

export class UserServiceError extends ApplicationError {
  constructor(code: UserServiceErrorCode, message?: string) {
    super(message ?? code, code === 'USER_NOT_FOUND' ? 404 : 400, code);
  }
}

export interface ProviderUserInput {
  id?: string;
  providerUserId?: string;
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
    @inject(TYPES.UserRepository) private readonly userRepository: UserRepositoryContract,
    @inject(TYPES.BookRepository) private readonly bookRepository: BookRepositoryContract,
    @inject(TYPES.UserOnboardingService)
    private readonly userOnboardingService: UserOnboardingService
  ) {}

  private readonly logger = getLogger();

  initializeControllerContext(): void {
    void this.userRepository;
    void this.bookRepository;
  }

  private getProviderUserId(providerUser: ProviderUserInput): string | null {
    const raw = providerUser.providerUserId || providerUser.id;
    if (!raw) {
      return null;
    }

    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async findUserByLinkedIdentity(
    provider: string,
    providerUserId: string
  ): Promise<UserEntity | null> {
    const linkedIdentity = await UserAuthIdentity.findOne({
      where: {
        provider,
        providerUserId,
      },
    });

    if (!linkedIdentity) {
      return null;
    }

    const linkedUser = await this.userRepository.findById(linkedIdentity.userId);
    if (linkedUser) {
      return linkedUser;
    }

    // Defensive cleanup for stale links pointing to deleted users.
    await linkedIdentity.destroy();
    return null;
  }

  private async ensureIdentityLink(
    userId: number,
    provider: string,
    providerUserId: string,
    emailSnapshot: string
  ): Promise<'linked' | 'conflict'> {
    try {
      const [identity, created] = await UserAuthIdentity.findOrCreate({
        where: { provider, providerUserId },
        defaults: { userId, provider, providerUserId, emailSnapshot },
      });

      if (!created && identity.userId !== userId) {
        return 'conflict';
      }

      if (!created && identity.emailSnapshot !== emailSnapshot) {
        identity.emailSnapshot = emailSnapshot;
        await identity.save();
      }

      return 'linked';
    } catch (error: unknown) {
      // Unique constraint on (user_id, provider): the user already has a different
      // providerUserId linked for this provider. Return the disposition of the existing link.
      const existing = await UserAuthIdentity.findOne({ where: { userId, provider } });
      if (existing) {
        return existing.providerUserId !== providerUserId ? 'conflict' : 'linked';
      }
      throw error;
    }
  }

  async findOrCreateUser(
    providerUser: ProviderUserInput,
    provider: string
  ): Promise<{ user: UserEntity; isNewUser: boolean }> {
    const normalizedEmail = providerUser.email.trim().toLowerCase();
    const normalizedProvider = provider.trim().toLowerCase();
    const providerUserId = this.getProviderUserId(providerUser);

    if (providerUserId) {
      const linkedUser = await this.findUserByLinkedIdentity(normalizedProvider, providerUserId);
      if (linkedUser) {
        return { user: linkedUser, isNewUser: false };
      }
    }

    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      if (providerUserId) {
        const linkResult = await this.ensureIdentityLink(
          existing.id,
          normalizedProvider,
          providerUserId,
          normalizedEmail
        );

        if (linkResult === 'conflict') {
          const linkedUser = await this.findUserByLinkedIdentity(
            normalizedProvider,
            providerUserId
          );
          if (linkedUser) {
            return { user: linkedUser, isNewUser: false };
          }
        }
      }
      return { user: existing, isNewUser: false };
    }

    const payload: UserCreationAttributes = {
      email: normalizedEmail,
      name: providerUser.name?.trim() || 'Unknown',
      surname: providerUser.surname?.trim() || 'User',
      isActive: true,
      role: USER_ROLES.USER,
    };

    const created = await this.userRepository.create(payload);
    try {
      await this.userOnboardingService.seedDefaults(created.id);
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to seed defaults for new user');
    }

    if (providerUserId) {
      await this.ensureIdentityLink(created.id, normalizedProvider, providerUserId, normalizedEmail);
    }

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

    const completionRate = totalBooks > 0 ? Math.round((finishedBooks / totalBooks) * 100) : 0;

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
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserServiceError('USER_NOT_FOUND');
    }
    const updated = await this.userRepository.update(userId, { isActive: false });
    if (!updated) {
      throw new UserServiceError('USER_NOT_FOUND');
    }
    clearUserCache(user.email);
  }

  async deleteAccount(userId: number): Promise<void> {
    const deleted = await this.userRepository.delete(userId);
    if (!deleted) {
      throw new UserServiceError('USER_NOT_FOUND');
    }
  }
}
