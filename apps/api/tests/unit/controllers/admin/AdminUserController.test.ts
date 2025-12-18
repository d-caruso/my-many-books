import { AdminUserController } from '../../../../src/controllers/admin/AdminUserController';
import {
  AdminUserService,
  AdminUserServiceError,
} from '../../../../src/services/user/AdminUserService';
import { UniversalRequest } from '../../../../src/types';
import { UserEntity } from '../../../../src/repositories/user/UserRepositoryTypes';

describe('AdminUserController', () => {
  let controller: AdminUserController;
  let service: jest.Mocked<AdminUserService>;
  let baseRequest: UniversalRequest;

  const buildUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
    id: overrides.id ?? 1,
    email: overrides.email ?? 'user@example.com',
    name: overrides.name ?? 'John',
    surname: overrides.surname ?? 'Doe',
    isActive: overrides.isActive ?? true,
    role: overrides.role ?? 'user',
    creationDate: overrides.creationDate ?? new Date(),
    updateDate: overrides.updateDate ?? new Date(),
  });

  beforeEach(() => {
    service = {
      initializeControllerContext: jest.fn(),
      listUsers: jest.fn(),
      getUserById: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
    } as unknown as jest.Mocked<AdminUserService>;

    controller = new AdminUserController(service);

    baseRequest = {
      headers: { 'accept-language': 'en' },
      queryStringParameters: {},
      pathParameters: {},
      user: { id: 99, email: "test@example.com", role: 'admin', provider: "cognito" },
    };
  });

  describe('getAllUsers', () => {
    it('returns paginated users from service', async () => {
      service.listUsers.mockResolvedValue({
        rows: [buildUser({ id: 1 }), buildUser({ id: 2 })],
        total: 2,
        limit: 20,
        offset: 0,
      });

      const response = await controller.getAllUsers(baseRequest);

      expect(service.listUsers).toHaveBeenCalledWith(expect.objectContaining({ limit: 20, offset: 0 }));
      expect(response.statusCode).toBe(200);
      expect((response.data as { users: unknown }).users).toHaveLength(2);
    });

    it('maps service errors', async () => {
      service.listUsers.mockRejectedValue(new AdminUserServiceError('FORBIDDEN'));

      const response = await controller.getAllUsers(baseRequest);

      expect(response.statusCode).toBe(403);
    });
  });

  describe('getUserById', () => {
    it('returns user DTO', async () => {
      service.getUserById.mockResolvedValue(buildUser({ id: 10 }));

      const response = await controller.getUserById({
        ...baseRequest,
        pathParameters: { id: '10' },
      });

      expect(service.getUserById).toHaveBeenCalledWith(10);
      expect(response.statusCode).toBe(200);
    });

    it('validates id parameter', async () => {
      const response = await controller.getUserById(baseRequest);
      expect(response.statusCode).toBe(400);
    });
  });

  describe('updateUser', () => {
    it('delegates to service', async () => {
      service.updateUser.mockResolvedValue(buildUser({ id: 5, name: 'Jane' }));

      const response = await controller.updateUser({
        ...baseRequest,
        pathParameters: { id: '5' },
        body: { name: 'Jane', email: 'new@example.com' },
      });

      expect(service.updateUser).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ name: 'Jane' }),
        expect.any(Object)
      );
      expect(response.statusCode).toBe(200);
    });


    it('maps service error', async () => {
      service.updateUser.mockRejectedValue(new AdminUserServiceError('EMAIL_EXISTS'));

      const response = await controller.updateUser({
        ...baseRequest,
        pathParameters: { id: '5' },
        body: { email: 'taken@example.com' },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('deleteUser', () => {
    it('deletes via service', async () => {
      const response = await controller.deleteUser({
        ...baseRequest,
        pathParameters: { id: '6' },
      });

      expect(service.deleteUser).toHaveBeenCalledWith(6, expect.any(Object));
      expect(response.statusCode).toBe(200);
    });

    it('maps last admin error', async () => {
      service.deleteUser.mockRejectedValue(new AdminUserServiceError('LAST_ADMIN'));

      const response = await controller.deleteUser({
        ...baseRequest,
        pathParameters: { id: '6' },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
