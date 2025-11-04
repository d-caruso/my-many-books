// ================================================================
// tests/controllers/admin/AdminUserController.test.ts
// ================================================================

import { AdminUserController } from '../../../../src/controllers/admin/AdminUserController';
import { User } from '../../../../src/models/User';
import { UniversalRequest } from '../../../../src/types';
import { Op } from 'sequelize';

// Mock dependencies
jest.mock('../../../../src/models/User');

describe('AdminUserController', () => {
  let adminUserController: AdminUserController;
  let mockRequest: UniversalRequest;

  beforeEach(() => {
    adminUserController = new AdminUserController();
    jest.clearAllMocks();

    // Mock BaseController's i18n methods
    (adminUserController as any).initializeI18n = jest.fn().mockResolvedValue(undefined);
    (adminUserController as any).t = jest.fn((key: string) => {
      if (key === 'errors:user_id_required') return 'User ID is required';
      if (key === 'errors:invalid_request_body') return 'Invalid request body';
      if (key === 'errors:user_not_found') return 'User not found';
      if (key === 'errors:email_already_exists') return 'Email already exists';
      if (key === 'errors:cannot_delete_last_admin') return 'Cannot delete the last admin user';
      if (key === 'errors:internal_server_error') return 'Internal server error';
      if (key === 'errors:validation_failed') return 'Validation failed';
      if (key === 'success:user_deleted') return 'User deleted successfully';
      return key; // Fallback for other keys
    });

    mockRequest = {
      queryStringParameters: {},
      pathParameters: {},
      headers: { 'accept-language': 'en' },
      body: undefined,
    };
  });

  describe('getAllUsers', () => {
    it('should return a paginated list of users', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@example.com', name: 'John', surname: 'Doe', isActive: true, role: 'user', creationDate: new Date(), updateDate: new Date(), getFullName: () => 'John Doe' },
        { id: 2, email: 'user2@example.com', name: 'Jane', surname: 'Smith', isActive: true, role: 'user', creationDate: new Date(), updateDate: new Date(), getFullName: () => 'Jane Smith' },
      ];

      (User.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 2,
        rows: mockUsers,
      });

      mockRequest.queryStringParameters = { page: '1', limit: '10' };

      const result = await adminUserController.getAllUsers(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as any).users).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(User.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
          order: [['creationDate', 'DESC']],
          attributes: ['id', 'email', 'name', 'surname', 'isActive', 'role', 'creationDate', 'updateDate'],
        })
      );
    });

    it('should return a filtered list of users based on search query', async () => {
      const mockUsers = [
        { id: 1, email: 'john@example.com', name: 'John', surname: 'Doe', isActive: true, role: 'user', creationDate: new Date(), updateDate: new Date(), getFullName: () => 'John Doe' },
      ];

      (User.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 1,
        rows: mockUsers,
      });

      mockRequest.queryStringParameters = { search: 'john' };

      const result = await adminUserController.getAllUsers(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      console.log(result);
      expect((result.data as any).users).toHaveLength(1);
      expect(User.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            [Op.or]: [
              { email: { [Op.like]: '%john%' } },
              { name: { [Op.like]: '%john%' } },
              { surname: { [Op.like]: '%john%' } },
            ],
          },
        })
      );
    });

    it('should handle errors during user retrieval', async () => {
      (User.findAndCountAll as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await adminUserController.getAllUsers(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('getUserById', () => {
    it('should return a user by ID', async () => {
      const mockUser = { id: 1, email: 'user1@example.com', name: 'John', surname: 'Doe', isActive: true, role: 'user', creationDate: new Date(), updateDate: new Date(), getFullName: () => 'John Doe' };
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      mockRequest.pathParameters = { id: '1' };

      const result = await adminUserController.getUserById(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as any).id).toBe(1);
      expect(User.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('should return 400 if user ID is missing', async () => {
      mockRequest.pathParameters = {};

      const result = await adminUserController.getUserById(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe((adminUserController as any).t('errors:user_id_required'));
    });

    it('should return 404 if user is not found', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      mockRequest.pathParameters = { id: '999' };

      const result = await adminUserController.getUserById(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle errors during user retrieval by ID', async () => {
      (User.findByPk as jest.Mock).mockRejectedValue(new Error('Database error'));

      mockRequest.pathParameters = { id: '1' };

      const result = await adminUserController.getUserById(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'user1@example.com',
        name: 'John',
        surname: 'Doe',
        isActive: true,
        role: 'user',
        creationDate: new Date(),
        updateDate: new Date(),
        getFullName: () => 'John Doe',
        update: jest.fn(function (this: any, values: any) {
          Object.assign(this, values);
          return Promise.resolve(this);
        }),
      };
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (User.findOne as jest.Mock).mockResolvedValue(null); // No existing user with new email

      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify({ name: 'Jonathan', isActive: false, role: 'admin' });

      const result = await adminUserController.updateUser(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(mockUser.update).toHaveBeenCalledWith({ name: 'Jonathan', isActive: false, role: 'admin' });
      expect((result.data as any).name).toBe('Jonathan');
      expect((result.data as any).isActive).toBe(false);
      expect((result.data as any).role).toBe('admin');
    });

    it('should return 400 if user ID is missing', async () => {
      mockRequest.pathParameters = {};
      mockRequest.body = JSON.stringify({ name: 'John' });

      const result = await adminUserController.updateUser(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe((adminUserController as any).t('errors:user_id_required'));
    });

    it('should return 400 if request body is missing', async () => {
      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = null;

      const result = await adminUserController.updateUser(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe((adminUserController as any).t('errors:invalid_request_body'));
    });

    it('should return 400 for validation errors', async () => {
      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify({ email: 'invalid-email' });

      const result = await adminUserController.updateUser(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    it('should return 404 if user to update is not found', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      mockRequest.pathParameters = { id: '999' };
      mockRequest.body = JSON.stringify({ name: 'Jonathan' });

      const result = await adminUserController.updateUser(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return 400 if new email already exists', async () => {
      const mockUser = {
        id: 1,
        email: 'user1@example.com',
        name: 'John',
        surname: 'Doe',
        isActive: true,
        role: 'user',
        creationDate: new Date(),
        updateDate: new Date(),
        getFullName: () => 'John Doe',
        update: jest.fn().mockResolvedValue(true),
      };
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (User.findOne as jest.Mock).mockResolvedValue({ id: 2, email: 'new@example.com' }); // Another user with this email

      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify({ email: 'new@example.com' });

      const result = await adminUserController.updateUser(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe((adminUserController as any).t('errors:email_already_exists'));
    });

    it('should handle errors during user update', async () => {
      const mockUser = {
        id: 1,
        email: 'user1@example.com',
        name: 'John',
        surname: 'Doe',
        isActive: true,
        role: 'user',
        creationDate: new Date(),
        updateDate: new Date(),
        getFullName: () => 'John Doe',
        update: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (User.findOne as jest.Mock).mockResolvedValue(null);

      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify({ name: 'Jonathan' });

      const result = await adminUserController.updateUser(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'user1@example.com',
        name: 'John',
        surname: 'Doe',
        isActive: true,
        role: 'user',
        creationDate: new Date(),
        updateDate: new Date(),
        getFullName: () => 'John Doe',
        isAdmin: () => false, // Not an admin
        destroy: jest.fn().mockResolvedValue(true),
      };
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (User.count as jest.Mock).mockResolvedValue(2); // More than one admin

      mockRequest.pathParameters = { id: '1' };

      const result = await adminUserController.deleteUser(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as any).message).toBe((adminUserController as any).t('success:user_deleted'));
      expect(mockUser.destroy).toHaveBeenCalled();
    });

    it('should return 400 if user ID is missing', async () => {
      mockRequest.pathParameters = {};

      const result = await adminUserController.deleteUser(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe((adminUserController as any).t('errors:user_id_required'));
    });

    it('should return 404 if user to delete is not found', async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      mockRequest.pathParameters = { id: '999' };

      const result = await adminUserController.deleteUser(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return 400 if trying to delete the last admin', async () => {
      const mockAdminUser = {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin',
        surname: 'User',
        isActive: true,
        role: 'admin',
        creationDate: new Date(),
        updateDate: new Date(),
        getFullName: () => 'Admin User',
        isAdmin: () => true, // Is an admin
        destroy: jest.fn(),
      };
      (User.findByPk as jest.Mock).mockResolvedValue(mockAdminUser);
      (User.count as jest.Mock).mockResolvedValue(1); // Only one admin left

      mockRequest.pathParameters = { id: '1' };

      const result = await adminUserController.deleteUser(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe((adminUserController as any).t('errors:cannot_delete_last_admin'));
      expect(mockAdminUser.destroy).not.toHaveBeenCalled();
    });

    it('should handle errors during user deletion', async () => {
      const mockUser = {
        id: 1,
        email: 'user1@example.com',
        name: 'John',
        surname: 'Doe',
        isActive: true,
        role: 'user',
        creationDate: new Date(),
        updateDate: new Date(),
        getFullName: () => 'John Doe',
        isAdmin: () => false,
        destroy: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      (User.count as jest.Mock).mockResolvedValue(2);

      mockRequest.pathParameters = { id: '1' };

      const result = await adminUserController.deleteUser(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });
});
