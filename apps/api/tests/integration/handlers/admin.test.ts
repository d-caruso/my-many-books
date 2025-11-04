// ================================================================
// tests/integration/handlers/admin.test.ts
// Integration tests for Admin Lambda handlers
// ================================================================

import { APIGatewayProxyEvent } from 'aws-lambda';
import * as adminHandler from '../../../src/handlers/admin';
import { ModelManager } from '../../../src/models';
import { User } from '../../../src/models/User';
import { Book } from '../../../src/models/Book';
import { Author } from '../../../src/models/Author';
import { Category } from '../../../src/models/Category';
import { Sequelize } from 'sequelize';

describe('Admin Handler Integration', () => {
  let sequelize: Sequelize;
  let adminUser: User;
  let regularUser: User;

  beforeAll(async () => {
    // Setup test database
    sequelize = new Sequelize('sqlite::memory:', {
      logging: false,
    });

    // Initialize all models
    ModelManager.initialize(sequelize);
    await ModelManager.syncDatabase(true);
  });

  afterAll(async () => {
    await ModelManager.close();
  });

  beforeEach(async () => {
    // Clean up data before each test
    try {
      await Book.destroy({ where: {}, truncate: true });
      await Author.destroy({ where: {}, truncate: true });
      await Category.destroy({ where: {}, truncate: true });
      await User.destroy({ where: {}, truncate: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Create test users
    adminUser = await User.create({
      email: 'admin@test.com',
      name: 'Admin',
      surname: 'User',
      role: 'admin',
      isActive: true,
    } as any);

    regularUser = await User.create({
      email: 'user@test.com',
      name: 'Regular',
      surname: 'User',
      role: 'user',
      isActive: true,
    } as any);
  });

  // Helper function to create mock API Gateway event with authentication
  const createMockEvent = (
    overrides: Partial<APIGatewayProxyEvent> = {},
    userId?: number,
    userRole: string = 'user'
  ): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    path: '/admin',
    pathParameters: null,
    queryStringParameters: null,
    body: null,
    headers: { 'accept-language': 'en' },
    requestContext: {
      requestId: 'test-request-id',
      requestTime: '09/Apr/2015:12:34:56 +0000',
      requestTimeEpoch: 1428582896000,
      httpMethod: 'GET',
      path: '/admin',
      protocol: 'HTTP/1.1',
      resourcePath: '/admin',
      stage: 'test',
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'Custom User Agent String',
        accountId: '123456789012',
        apiKey: 'test-api-key',
        accessKey: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        user: null,
        userArn: null,
      },
      accountId: '123456789012',
      resourceId: '123456',
      apiId: '1234567890',
      authorizer: userId ? {
        userId: userId.toString(),
        email: userRole === 'admin' ? adminUser.email : regularUser.email,
        role: userRole,
      } : undefined,
    } as any,
    resource: '/admin',
    stageVariables: null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    ...overrides,
  });

  describe('GET /admin/stats/summary', () => {
    beforeEach(async () => {
      // Create test data
      await User.create({
        email: 'user2@test.com',
        name: 'User',
        surname: 'Two',
        role: 'user',
        isActive: false,
      } as any);

      await Author.create({
        name: 'Test',
        surname: 'Author',
      } as any);

      await Category.create({
        name: 'Fiction',
      } as any);

      await Book.create({
        title: 'Test Book 1',
        userId: regularUser.id,
      } as any);

      await Book.create({
        title: 'Test Book 2',
        userId: regularUser.id,
      } as any);
    });

    test('should return stats summary for admin user', async () => {
      const event = createMockEvent(
        {
          path: '/admin/stats/summary',
          httpMethod: 'GET',
        },
        adminUser.id,
        'admin'
      );

      const response = await adminHandler.getAdminStatsSummary(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('totalUsers');
      expect(body.data).toHaveProperty('activeUsers');
      expect(body.data).toHaveProperty('adminUsers');
      expect(body.data).toHaveProperty('totalBooks');
      expect(body.data.totalUsers).toBe(3); // admin + regularUser + user2
      expect(body.data.activeUsers).toBe(2); // admin + regularUser
      expect(body.data.adminUsers).toBe(1); // admin
      expect(body.data.totalBooks).toBe(2);
    });

    test('should return 403 for non-admin user', async () => {
      const event = createMockEvent(
        {
          path: '/admin/stats/summary',
          httpMethod: 'GET',
        },
        regularUser.id,
        'user'
      );

      const response = await adminHandler.getAdminStatsSummary(event);

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    test('should return 401 for unauthenticated request', async () => {
      const event = createMockEvent({
        path: '/admin/stats/summary',
        httpMethod: 'GET',
      });

      const response = await adminHandler.getAdminStatsSummary(event);

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /admin/users', () => {
    beforeEach(async () => {
      // Create additional test users
      for (let i = 1; i <= 5; i++) {
        await User.create({
          email: `user${i}@test.com`,
          name: `User`,
          surname: `${i}`,
          role: i === 5 ? 'admin' : 'user',
          isActive: i % 2 === 0,
        } as any);
      }
    });

    test('should return paginated user list for admin', async () => {
      const event = createMockEvent(
        {
          path: '/admin/users',
          httpMethod: 'GET',
          queryStringParameters: { page: '1', pageSize: '10' },
        },
        adminUser.id,
        'admin'
      );

      const response = await adminHandler.getAdminUsers(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('users');
      expect(body.data).toHaveProperty('pagination');
      expect(Array.isArray(body.data.users)).toBe(true);
      expect(body.data.users.length).toBeGreaterThan(0);
      expect(body.data.pagination).toHaveProperty('total');
      expect(body.data.pagination).toHaveProperty('page');
      expect(body.data.pagination).toHaveProperty('pageSize');
    });

    test('should support search by name or email', async () => {
      const event = createMockEvent(
        {
          path: '/admin/users',
          httpMethod: 'GET',
          queryStringParameters: {
            page: '1',
            pageSize: '10',
            search: 'User 1'
          },
        },
        adminUser.id,
        'admin'
      );

      const response = await adminHandler.getAdminUsers(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.users.length).toBeGreaterThan(0);
    });

    test('should return 403 for non-admin user', async () => {
      const event = createMockEvent(
        {
          path: '/admin/users',
          httpMethod: 'GET',
        },
        regularUser.id,
        'user'
      );

      const response = await adminHandler.getAdminUsers(event);

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /admin/users/:id', () => {
    test('should return user details by ID for admin', async () => {
      const event = createMockEvent(
        {
          path: `/admin/users/${regularUser.id}`,
          pathParameters: { id: regularUser.id.toString() },
          httpMethod: 'GET',
        },
        adminUser.id,
        'admin'
      );

      const response = await adminHandler.getAdminUserById(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data.id).toBe(regularUser.id);
      expect(body.data.email).toBe(regularUser.email);
    });

    test('should return 404 for non-existent user', async () => {
      const event = createMockEvent(
        {
          path: '/admin/users/99999',
          pathParameters: { id: '99999' },
          httpMethod: 'GET',
        },
        adminUser.id,
        'admin'
      );

      const response = await adminHandler.getAdminUserById(event);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /admin/users/:id', () => {
    test('should update user for admin', async () => {
      const updateData = {
        name: 'Updated',
        surname: 'Name',
        role: 'admin',
      };

      const event = createMockEvent(
        {
          path: `/admin/users/${regularUser.id}`,
          pathParameters: { id: regularUser.id.toString() },
          httpMethod: 'PUT',
          body: JSON.stringify(updateData),
        },
        adminUser.id,
        'admin'
      );

      const response = await adminHandler.updateAdminUser(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe(updateData.name);
      expect(body.data.surname).toBe(updateData.surname);

      // Verify database update
      const updatedUser = await User.findByPk(regularUser.id);
      expect(updatedUser?.name).toBe(updateData.name);
    });

    test('should return 403 for non-admin user', async () => {
      const event = createMockEvent(
        {
          path: `/admin/users/${regularUser.id}`,
          pathParameters: { id: regularUser.id.toString() },
          httpMethod: 'PUT',
          body: JSON.stringify({ name: 'Hacker' }),
        },
        regularUser.id,
        'user'
      );

      const response = await adminHandler.updateAdminUser(event);

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /admin/users/:id', () => {
    test('should delete user for admin', async () => {
      const userToDelete = await User.create({
        email: 'delete@test.com',
        name: 'Delete',
        surname: 'Me',
        role: 'user',
        isActive: true,
      } as any);

      const event = createMockEvent(
        {
          path: `/admin/users/${userToDelete.id}`,
          pathParameters: { id: userToDelete.id.toString() },
          httpMethod: 'DELETE',
        },
        adminUser.id,
        'admin'
      );

      const response = await adminHandler.deleteAdminUser(event);

      expect(response.statusCode).toBe(200);

      // Verify deletion
      const deletedUser = await User.findByPk(userToDelete.id);
      expect(deletedUser).toBeNull();
    });

    test('should return 403 for non-admin user', async () => {
      const event = createMockEvent(
        {
          path: `/admin/users/${regularUser.id}`,
          pathParameters: { id: regularUser.id.toString() },
          httpMethod: 'DELETE',
        },
        regularUser.id,
        'user'
      );

      const response = await adminHandler.deleteAdminUser(event);

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /admin/books', () => {
    beforeEach(async () => {
      await Author.create({
        name: 'Test',
        surname: 'Author',
      } as any);

      await Category.create({
        name: 'Fiction',
      } as any);

      // Create test books
      for (let i = 1; i <= 3; i++) {
        await Book.create({
          title: `Book ${i}`,
          isbnCode: `ISBN${i}`,
          userId: regularUser.id,
        } as any);
      }
    });

    test('should return paginated book list for admin', async () => {
      const event = createMockEvent(
        {
          path: '/admin/books',
          httpMethod: 'GET',
          queryStringParameters: { page: '1', pageSize: '10' },
        },
        adminUser.id,
        'admin'
      );

      const response = await adminHandler.getAdminBooks(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('books');
      expect(body.data).toHaveProperty('pagination');
      expect(Array.isArray(body.data.books)).toBe(true);
      expect(body.data.books.length).toBe(3);
    });

    test('should support search by title or ISBN', async () => {
      const event = createMockEvent(
        {
          path: '/admin/books',
          httpMethod: 'GET',
          queryStringParameters: {
            page: '1',
            pageSize: '10',
            search: 'Book 1'
          },
        },
        adminUser.id,
        'admin'
      );

      const response = await adminHandler.getAdminBooks(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.books.length).toBeGreaterThan(0);
    });

    test('should return 403 for non-admin user', async () => {
      const event = createMockEvent(
        {
          path: '/admin/books',
          httpMethod: 'GET',
        },
        regularUser.id,
        'user'
      );

      const response = await adminHandler.getAdminBooks(event);

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /admin/books/:id', () => {
    let testBook: Book;

    beforeEach(async () => {
      testBook = await Book.create({
        title: 'Book to Delete',
        isbnCode: 'ISBN123',
        userId: regularUser.id,
      } as any);
    });

    test('should delete book for admin', async () => {
      const event = createMockEvent(
        {
          path: `/admin/books/${testBook.id}`,
          pathParameters: { id: testBook.id.toString() },
          httpMethod: 'DELETE',
        },
        adminUser.id,
        'admin'
      );

      const response = await adminHandler.deleteAdminBook(event);

      expect(response.statusCode).toBe(200);

      // Verify deletion
      const deletedBook = await Book.findByPk(testBook.id);
      expect(deletedBook).toBeNull();
    });

    test('should return 403 for non-admin user', async () => {
      const event = createMockEvent(
        {
          path: `/admin/books/${testBook.id}`,
          pathParameters: { id: testBook.id.toString() },
          httpMethod: 'DELETE',
        },
        regularUser.id,
        'user'
      );

      const response = await adminHandler.deleteAdminBook(event);

      expect(response.statusCode).toBe(403);
    });
  });
});
