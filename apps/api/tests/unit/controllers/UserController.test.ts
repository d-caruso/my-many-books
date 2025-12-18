import { UserController } from '../../../src/controllers/UserController';
import { UserService, UserServiceError } from '../../../src/services/user/UserService';
import { UniversalRequest } from '../../../src/types';

const buildRequest = (overrides: Partial<UniversalRequest> = {}): UniversalRequest => ({
  headers: { 'accept-language': 'en' },
  queryStringParameters: {},
  pathParameters: {},
  user?: { id: 1 },
  ...overrides,
});

const buildUser = () => ({
  id: 1,
  email: 'user@example.com',
      role: 'user',
  name: 'John',
  surname: 'Doe',
  isActive: true,
    creationDate: new Date('2023-01-01'),
  updateDate: new Date('2023-01-02'),
});

describe('UserController', () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;

  beforeEach(() => {
    service = {
      initializeControllerContext: jest.fn(),
      requireUser: jest.fn(),
      updateCurrentUser: jest.fn(),
      listUserBooks: jest.fn(),
      getUserStats: jest.fn(),
      deactivateAccount: jest.fn(),
      deleteAccount: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    controller = new UserController(service);
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('returns the current user profile', async () => {
      service.requireUser.mockResolvedValue(buildUser() as any);

      const response = await controller.getCurrentUser(buildRequest());

      expect(service.requireUser).toHaveBeenCalledWith(1);
      expect(response.statusCode).toBe(200);
      expect(response.data).toMatchObject({ id: 1, email: 'user@example.com' });
    });

    it('returns 401 when request lacks authentication', async () => {
      const response = await controller.getCurrentUser(buildRequest({ user: undefined }));
      expect(response.statusCode).toBe(401);
    });

    it('maps service errors to HTTP codes', async () => {
      service.requireUser.mockRejectedValue(new UserServiceError('USER_NOT_FOUND'));

      const response = await controller.getCurrentUser(buildRequest());

      expect(response.statusCode).toBe(404);
    });
  });

  describe('updateCurrentUser', () => {
    it('validates payload and updates user', async () => {
      const updatedUser = buildUser();
      updatedUser.name = 'Jane';
      updatedUser.surname = 'Smith';
      service.updateCurrentUser.mockResolvedValue(updatedUser as any);

      const response = await controller.updateCurrentUser(
        buildRequest({ body: JSON.stringify({ name: 'Jane', surname: 'Smith' }) })
      );

      expect(service.updateCurrentUser).toHaveBeenCalledWith(1, { name: 'Jane', surname: 'Smith' });
      expect(response.statusCode).toBe(200);
      expect(response.data).toMatchObject({ name: 'Jane', surname: 'Smith' });
    });

  });

  describe('getUserBooks', () => {
    it('returns paginated books', async () => {
      service.listUserBooks.mockResolvedValue({
        rows: [
          {
            id: 1,
            title: 'Example Book',
            isbnCode: '1234567890',
            authors: [{ id: 1, name: 'Alice', surname: 'Smith' }],
            categories: [{ id: 1, name: 'Fiction' }],
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      } as any);

      const response = await controller.getUserBooks(buildRequest());

      expect(service.listUserBooks).toHaveBeenCalledWith(1, {
        limit: 20,
        offset: 0,
        status: undefined,
      });
      expect(response.statusCode).toBe(200);
      const payload = response.data as { books: unknown[] };
      expect(payload.books).toHaveLength(1);
    });
  });

  describe('getUserStats', () => {
    it('returns stats from service', async () => {
      service.getUserStats.mockResolvedValue({
        totalBooks: 10,
        booksByStatus: { reading: 3, paused: 2, finished: 4, unspecified: 1 },
        completionRate: 40,
        recentBooks: [],
      });

      const response = await controller.getUserStats(buildRequest());
      expect(response.statusCode).toBe(200);
      expect(response.data).toMatchObject({ totalBooks: 10 });
    });
  });

  describe('deactivateAccount', () => {
    it('calls service and returns message', async () => {
      const response = await controller.deactivateAccount(buildRequest());
      expect(service.deactivateAccount).toHaveBeenCalledWith(1);
      expect(response.statusCode).toBe(200);
    });
  });

  describe('deleteAccount', () => {
    it('calls service delete', async () => {
      const response = await controller.deleteAccount(buildRequest());
      expect(service.deleteAccount).toHaveBeenCalledWith(1);
      expect(response.statusCode).toBe(200);
    });
  });
});
