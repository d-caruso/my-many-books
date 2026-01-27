import { UserService, UserServiceError } from '../../../src/services/user/UserService';
import { Repository as UserRepositoryContract } from '../../../src/repositories/user/Repository';
import { Repository as BookRepositoryContract } from '../../../src/repositories/book/Repository';
import { BOOK_STATUS } from '@my-many-books/shared-types';

describe('UserService', () => {
  let userRepository: jest.Mocked<UserRepositoryContract>;
  let bookRepository: jest.Mocked<BookRepositoryContract>;
  let service: UserService;

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

    service = new UserService(userRepository, bookRepository);
  });

  describe('findOrCreateUser', () => {
    it('returns existing user when found', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: 1 } as any);

      const result = await service.findOrCreateUser(
        { email: 'user@example.com', name: 'John', surname: 'Doe' },
        'cognito'
      );

      expect(result.isNewUser).toBe(false);
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('creates user when not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({ id: 2 } as any);

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
    });
  });

  describe('updateCurrentUser', () => {
    it('updates user via repository', async () => {
      userRepository.update.mockResolvedValue({ id: 1, name: 'Jane' } as any);

      const updated = await service.updateCurrentUser(1, { name: 'Jane', surname: 'Doe' });

      expect(userRepository.update).toHaveBeenCalledWith(1, {
        name: 'Jane',
        surname: 'Doe',
      });
      expect(updated).toMatchObject({ id: 1 });
    });

    it('throws when user missing', async () => {
      userRepository.update.mockResolvedValue(null);
      await expect(
        service.updateCurrentUser(1, { name: 'Jane', surname: 'Doe' })
      ).rejects.toBeInstanceOf(UserServiceError);
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
      userRepository.update.mockResolvedValue({ id: 1 } as any);
      await service.deactivateAccount(1);
      expect(userRepository.update).toHaveBeenCalledWith(1, { isActive: false });
    });

    it('throws on missing user', async () => {
      userRepository.update.mockResolvedValue(null);
      await expect(service.deactivateAccount(1)).rejects.toBeInstanceOf(UserServiceError);
    });
  });

  describe('deleteAccount', () => {
    it('calls repository delete', async () => {
      userRepository.delete.mockResolvedValue(true);
      await service.deleteAccount(1);
      expect(userRepository.delete).toHaveBeenCalledWith(1);
    });
  });
});
