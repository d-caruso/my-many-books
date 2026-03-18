import { UserService, UserServiceError } from '../../../src/services/user/UserService';
import { Repository as UserRepositoryContract } from '../../../src/repositories/user/Repository';
import { Repository as BookRepositoryContract } from '../../../src/repositories/book/Repository';
import { UserOnboardingService } from '../../../src/services/user/UserOnboardingService';
import { UserAuthIdentity } from '../../../src/models/UserAuthIdentity';
import { BOOK_STATUS } from '@my-many-books/shared-types';
import { emitHookEvent } from '../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../src/services/hooks/events';

const mockCognitoChangePassword = jest.fn();

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
jest.mock('@my-many-books/shared-logging', () => ({
  getLogger: () => mockLogger,
}));
jest.mock('../../../src/models/UserAuthIdentity', () => ({
  UserAuthIdentity: {
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock('../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/services/auth/cognitoPasswordService', () => ({
  cognitoPasswordService: {
    changePassword: (...args: unknown[]) => mockCognitoChangePassword(...args),
  },
}));

describe('UserService', () => {
  let userRepository: jest.Mocked<UserRepositoryContract>;
  let bookRepository: jest.Mocked<BookRepositoryContract>;
  let userOnboardingService: jest.Mocked<UserOnboardingService>;
  let userAuthIdentityModel: {
    findOne: jest.Mock;
    findOrCreate: jest.Mock;
    create: jest.Mock;
  };
  let service: UserService;
  const emitHookEventMock = emitHookEvent as jest.MockedFunction<typeof emitHookEvent>;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<UserRepositoryContract>;

    bookRepository = {
      listUserBooks: jest.fn(),
      countUserBooks: jest.fn(),
      findRecentUserBooks: jest.fn(),
    } as unknown as jest.Mocked<BookRepositoryContract>;

    userOnboardingService = {
      seedDefaults: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UserOnboardingService>;

    service = new UserService(userRepository, bookRepository, userOnboardingService);

    userAuthIdentityModel = UserAuthIdentity as unknown as {
      findOne: jest.Mock;
      findOrCreate: jest.Mock;
      create: jest.Mock;
    };
    userAuthIdentityModel.findOne.mockReset();
    userAuthIdentityModel.findOrCreate.mockReset();
    userAuthIdentityModel.create.mockReset();
    emitHookEventMock.mockClear();
    mockCognitoChangePassword.mockReset();
  });

  describe('findOrCreateUser', () => {
    it('returns linked user when provider subject mapping exists', async () => {
      userAuthIdentityModel.findOne.mockResolvedValue({
        userId: 44,
        destroy: jest.fn(),
      });
      userRepository.findById.mockResolvedValue({
        id: 44,
        email: 'linked@example.com',
      } as any);

      const result = await service.findOrCreateUser(
        { id: 'google-sub-44', email: 'linked@example.com' },
        'google'
      );

      expect(result.isNewUser).toBe(false);
      expect(result.user).toMatchObject({ id: 44, email: 'linked@example.com' });
      expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('returns existing user when found', async () => {
      userAuthIdentityModel.findOne.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue({ id: 1 } as any);

      const result = await service.findOrCreateUser(
        { email: 'user@example.com', name: 'John', surname: 'Doe' },
        'cognito'
      );

      expect(result.isNewUser).toBe(false);
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('links provider identity when existing user is matched by email', async () => {
      userAuthIdentityModel.findOne.mockResolvedValueOnce(null);
      userAuthIdentityModel.findOrCreate.mockResolvedValue([
        { userId: 1, providerUserId: 'google-sub-001', emailSnapshot: 'existing@example.com' },
        true,
      ]);
      userRepository.findByEmail.mockResolvedValue({
        id: 1,
        email: 'existing@example.com',
      } as any);

      const result = await service.findOrCreateUser(
        { id: 'google-sub-001', email: 'existing@example.com' },
        'google'
      );

      expect(result.isNewUser).toBe(false);
      expect(userAuthIdentityModel.findOrCreate).toHaveBeenCalledWith({
        where: { provider: 'google', providerUserId: 'google-sub-001' },
        defaults: {
          userId: 1,
          provider: 'google',
          providerUserId: 'google-sub-001',
          emailSnapshot: 'existing@example.com',
        },
      });
      expect(userAuthIdentityModel.create).not.toHaveBeenCalled();
    });

    it('handles unique constraint violation when user already has a different provider link', async () => {
      userAuthIdentityModel.findOne
        .mockResolvedValueOnce(null)                                           // findUserByLinkedIdentity (initial)
        .mockResolvedValueOnce({ userId: 1, providerUserId: 'google-sub-A' }) // catch: findOne({userId, provider})
        .mockResolvedValueOnce(null);                                          // findUserByLinkedIdentity (conflict fallback)
      userAuthIdentityModel.findOrCreate.mockRejectedValue(
        new Error('Unique constraint violation on user_id+provider')
      );
      userRepository.findByEmail.mockResolvedValue({
        id: 1,
        email: 'existing@example.com',
      } as any);

      const result = await service.findOrCreateUser(
        { id: 'google-sub-B', email: 'existing@example.com' },
        'google'
      );

      expect(result.isNewUser).toBe(false);
      expect(result.user).toMatchObject({ id: 1, email: 'existing@example.com' });
      expect(userAuthIdentityModel.create).not.toHaveBeenCalled();
    });

    it('returns provider-linked user when link creation conflicts with another user', async () => {
      userAuthIdentityModel.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ userId: 2, destroy: jest.fn() });
      userAuthIdentityModel.findOrCreate.mockResolvedValue([
        { userId: 2, providerUserId: 'google-sub-002', emailSnapshot: 'conflict@example.com' },
        false,
      ]);
      userRepository.findByEmail.mockResolvedValue({
        id: 1,
        email: 'conflict@example.com',
      } as any);
      userRepository.findById.mockResolvedValue({
        id: 2,
        email: 'linked@example.com',
      } as any);

      const result = await service.findOrCreateUser(
        { id: 'google-sub-002', email: 'conflict@example.com' },
        'google'
      );

      expect(result.isNewUser).toBe(false);
      expect(result.user).toMatchObject({ id: 2, email: 'linked@example.com' });
      expect(userAuthIdentityModel.create).not.toHaveBeenCalled();
    });

    it('removes stale identity links and falls back to email matching', async () => {
      const staleIdentity = {
        userId: 99,
        destroy: jest.fn().mockResolvedValue(undefined),
      };
      userAuthIdentityModel.findOne.mockResolvedValueOnce(staleIdentity);
      userRepository.findById.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue({
        id: 1,
        email: 'existing@example.com',
      } as any);
      userAuthIdentityModel.findOrCreate.mockResolvedValue([
        { userId: 1, providerUserId: 'google-sub-001', emailSnapshot: 'existing@example.com' },
        true,
      ]);

      const result = await service.findOrCreateUser(
        { id: 'google-sub-001', email: 'existing@example.com' },
        'google'
      );

      expect(staleIdentity.destroy).toHaveBeenCalledTimes(1);
      expect(result.user).toMatchObject({ id: 1, email: 'existing@example.com' });
    });

    it('creates user when not found', async () => {
      userAuthIdentityModel.findOne.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        id: 2,
        email: 'new@example.com',
        role: 'user',
        isActive: true,
        name: 'Unknown',
        surname: 'User',
      } as any);

      const result = await service.findOrCreateUser(
        { email: 'new@example.com', name: null, surname: null },
        'cognito'
      );

      expect(result.isNewUser).toBe(true);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
      role: 'user',
          name: 'Unknown',
          surname: 'User',
        })
      );
      expect(emitHookEventMock).toHaveBeenCalledWith(
        EVENTS.USER.PROVISION.AFTER,
        expect.objectContaining({
          provider: 'cognito',
          defaultsSeeded: true,
          user: expect.objectContaining({
            id: 2,
            email: 'new@example.com',
          }),
        })
      );
    });

    it('calls seedDefaults when creating a new user', async () => {
      userAuthIdentityModel.findOne.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({ id: 5 } as any);

      await service.findOrCreateUser({ email: 'new@example.com' }, 'cognito');

      expect(userOnboardingService.seedDefaults).toHaveBeenCalledWith(5);
    });

    it('does not call seedDefaults for existing users', async () => {
      userAuthIdentityModel.findOne.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue({ id: 1 } as any);

      await service.findOrCreateUser({ email: 'existing@example.com' }, 'cognito');

      expect(userOnboardingService.seedDefaults).not.toHaveBeenCalled();
    });

    it('still returns user when seeding fails', async () => {
      userAuthIdentityModel.findOne.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({ id: 3 } as any);
      userOnboardingService.seedDefaults.mockRejectedValue(new Error('Seeding failed'));

      const result = await service.findOrCreateUser({ email: 'new@example.com' }, 'cognito');

      expect(result.user).toMatchObject({ id: 3 });
      expect(result.isNewUser).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        'Failed to seed defaults for new user'
      );
    });

  });

  describe('updateCurrentUser', () => {
    it('updates user via repository', async () => {
      userRepository.update.mockResolvedValue({
        id: 1,
        email: 'jane@example.com',
        role: 'user',
        isActive: true,
        name: 'Jane',
        surname: 'Doe',
      } as any);

      const updated = await service.updateCurrentUser(1, { name: 'Jane', surname: 'Doe' });

      expect(userRepository.update).toHaveBeenCalledWith(1, {
        name: 'Jane',
        surname: 'Doe',
      });
      expect(updated).toMatchObject({ id: 1 });
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        1,
        EVENTS.USER.UPDATE.BEFORE,
        {
          user: { id: 1 },
          changes: { name: 'Jane', surname: 'Doe' },
        }
      );
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        2,
        EVENTS.USER.UPDATE.AFTER,
        expect.objectContaining({
          changes: { name: 'Jane', surname: 'Doe' },
          user: expect.objectContaining({ id: 1, email: 'jane@example.com' }),
        })
      );
    });

    it('throws when user missing', async () => {
      userRepository.update.mockResolvedValue(null);
      await expect(
        service.updateCurrentUser(1, { name: 'Jane', surname: 'Doe' })
      ).rejects.toBeInstanceOf(UserServiceError);
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        1,
        EVENTS.USER.UPDATE.BEFORE,
        {
          user: { id: 1 },
          changes: { name: 'Jane', surname: 'Doe' },
        }
      );
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        2,
        EVENTS.USER.UPDATE.FAILURE,
        expect.objectContaining({
          user: { id: 1 },
          changes: { name: 'Jane', surname: 'Doe' },
          error: expect.any(UserServiceError),
        })
      );
    });
  });

  describe('getUserStats', () => {
    it('compiles stats from repository', async () => {
      bookRepository.countUserBooks
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);
      bookRepository.findRecentUserBooks.mockResolvedValue([
        { id: 1, title: 'Recent', creationDate: new Date() } as any,
      ]);

      const stats = await service.getUserStats(1);

      expect(bookRepository.countUserBooks).toHaveBeenCalledWith(1, BOOK_STATUS.READING);
      expect(stats.totalBooks).toBe(5);
      expect(stats.recentBooks).toHaveLength(1);
    });
  });

  describe('deactivateAccount', () => {
    it('updates isActive to false', async () => {
      userRepository.findById.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        role: 'user',
        isActive: true,
        name: 'Test',
        surname: 'User',
      } as any);
      userRepository.update.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        role: 'user',
        isActive: false,
        name: 'Test',
        surname: 'User',
      } as any);
      await service.deactivateAccount(1);
      expect(userRepository.update).toHaveBeenCalledWith(1, { isActive: false });
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        1,
        EVENTS.USER.DEACTIVATE.BEFORE,
        { user: { id: 1 } }
      );
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        2,
        EVENTS.USER.DEACTIVATE.AFTER,
        expect.objectContaining({
          user: expect.objectContaining({ id: 1, email: 'test@example.com', isActive: false }),
        })
      );
    });

    it('throws on missing user', async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(service.deactivateAccount(1)).rejects.toBeInstanceOf(UserServiceError);
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        1,
        EVENTS.USER.DEACTIVATE.BEFORE,
        { user: { id: 1 } }
      );
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        2,
        EVENTS.USER.DEACTIVATE.FAILURE,
        expect.objectContaining({
          user: { id: 1 },
          error: expect.any(UserServiceError),
        })
      );
    });
  });

  describe('deleteAccount', () => {
    it('calls repository delete', async () => {
      userRepository.findById.mockResolvedValue({
        id: 1,
        email: 'delete@example.com',
        role: 'user',
        isActive: true,
        name: 'Delete',
        surname: 'Me',
      } as any);
      userRepository.delete.mockResolvedValue(true);
      await service.deleteAccount(1);
      expect(userRepository.delete).toHaveBeenCalledWith(1);
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        1,
        EVENTS.USER.DELETE.BEFORE,
        { user: { id: 1 } }
      );
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        2,
        EVENTS.USER.DELETE.AFTER,
        expect.objectContaining({
          user: expect.objectContaining({ id: 1, email: 'delete@example.com' }),
        })
      );
    });

    it('emits failure when delete target is missing', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.deleteAccount(1)).rejects.toBeInstanceOf(UserServiceError);

      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        1,
        EVENTS.USER.DELETE.BEFORE,
        { user: { id: 1 } }
      );
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        2,
        EVENTS.USER.DELETE.FAILURE,
        expect.objectContaining({
          user: { id: 1 },
          error: expect.any(UserServiceError),
        })
      );
    });
  });

  describe('changePassword', () => {
    it('emits before and after around the password change service', async () => {
      mockCognitoChangePassword.mockResolvedValue({
        accessToken: 'new-access',
        idToken: 'new-id',
        refreshToken: 'new-refresh',
        expiresIn: 3600,
      });

      const result = await service.changePassword(1, {
        email: 'user@example.com',
        currentPassword: 'Current123!',
        newPassword: 'NewPassword123!',
      });

      expect(result).toMatchObject({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        1,
        EVENTS.USER.PASSWORD.CHANGE.BEFORE,
        { user: { id: 1, email: 'user@example.com' } }
      );
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        2,
        EVENTS.USER.PASSWORD.CHANGE.AFTER,
        { user: { id: 1, email: 'user@example.com' } }
      );
    });

    it('emits failure when the password change service throws', async () => {
      const error = Object.assign(new Error('wrong password'), { name: 'NotAuthorizedException' });
      mockCognitoChangePassword.mockRejectedValue(error);

      await expect(
        service.changePassword(1, {
          email: 'user@example.com',
          currentPassword: 'Current123!',
          newPassword: 'NewPassword123!',
        })
      ).rejects.toThrow('wrong password');

      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        1,
        EVENTS.USER.PASSWORD.CHANGE.BEFORE,
        { user: { id: 1, email: 'user@example.com' } }
      );
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        2,
        EVENTS.USER.PASSWORD.CHANGE.FAILURE,
        expect.objectContaining({
          user: { id: 1, email: 'user@example.com' },
          error,
        })
      );
    });
  });
});
