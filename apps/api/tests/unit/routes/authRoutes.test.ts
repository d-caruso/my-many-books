// ================================================================
// tests/unit/routes/authRoutes.test.ts
// Unit tests for authentication routes
// ================================================================

// Mock dependencies BEFORE imports
jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('../../../src/middleware/auth', () => {
  const actual = jest.requireActual('../../../src/middleware/auth');
  return {
    ...actual,
    UserService: {
      findOrCreateUser: jest.fn(),
    },
  };
});
jest.mock('jsonwebtoken');
jest.mock('../../../src/config/database', () => ({
  default: {
    getInstance: jest.fn().mockReturnValue({
      authenticate: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));
jest.mock('../../../src/models', () => ({
  ModelManager: {
    initialize: jest.fn(),
    syncDatabase: jest.fn(),
    close: jest.fn(),
  },
}));
jest.mock('@my-many-books/shared-i18n', () => ({
  initializeI18n: jest.fn().mockResolvedValue(undefined),
  i18n: {
    t: jest.fn((key: string) => key),
    changeLanguage: jest.fn(),
    language: 'en',
  },
}));

import request from 'supertest';
import app from '../../../src/app';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { UserService } from '../../../src/middleware/auth';
import { User } from '../../../src/models/User';

const mockCognitoClient = CognitoIdentityProviderClient as jest.MockedClass<
  typeof CognitoIdentityProviderClient
>;

describe('Auth Routes', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let mockSend: jest.Mock;

  beforeAll(() => {
    // Suppress console.error during tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore console.error after tests
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockSend = jest.fn();
    mockCognitoClient.prototype.send = mockSend;
  });

  describe('POST /api/v1/auth/login', () => {
    const mockUser: Partial<User> = {
      id: 1,
      email: 'test@example.com',
      name: 'Test',
      surname: 'User',
      role: 'user',
      isActive: true,
    };

    beforeEach(() => {
      (UserService.findOrCreateUser as jest.Mock).mockResolvedValue({
        user: mockUser,
        isNewUser: false,
      });
    });

    it('should login successfully with valid credentials', async () => {
      const mockIdToken = 'mock.id.token';
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';

      // Mock Cognito response
      mockSend.mockResolvedValue({
        AuthenticationResult: {
          IdToken: mockIdToken,
          AccessToken: mockAccessToken,
          RefreshToken: mockRefreshToken,
          ExpiresIn: 3600,
        },
      });

      // Mock jwt decode
      const jwt = require('jsonwebtoken');
      jwt.decode = jest.fn().mockReturnValue({
        sub: 'cognito-user-123',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken', mockAccessToken);
      expect(response.body).toHaveProperty('idToken', mockIdToken);
      expect(response.body).toHaveProperty('expiresIn', 3600);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        surname: 'User',
        role: 'user',
        isActive: true,
      });

      // Check refresh token cookie is set
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.startsWith('refresh_token='))).toBe(true);

      // Verify HttpOnly and other security flags
      const refreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('Path=/api/v1/auth');
    });

    it('should return 401 with invalid credentials', async () => {
      mockSend.mockRejectedValue({
        name: 'NotAuthorizedException',
        message: 'Incorrect username or password',
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid email or password');
    });

    it('should return 401 when user not found', async () => {
      mockSend.mockRejectedValue({
        name: 'UserNotFoundException',
        message: 'User does not exist',
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'Password123!' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'User not found');
    });

    it('should return 400 without email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'Password123!' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email and password required');
    });

    it('should return 400 without password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email and password required');
    });

    it('should return 401 when token is invalid', async () => {
      mockSend.mockResolvedValue({
        AuthenticationResult: {
          IdToken: 'invalid.token',
          AccessToken: 'mock.access.token',
          RefreshToken: 'mock.refresh.token',
          ExpiresIn: 3600,
        },
      });

      // Mock jwt decode to return null (invalid token)
      const jwt = require('jsonwebtoken');
      jwt.decode = jest.fn().mockReturnValue(null);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid token');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const mockAccessToken = 'new.access.token';
      const mockIdToken = 'new.id.token';

      mockSend.mockResolvedValue({
        AuthenticationResult: {
          IdToken: mockIdToken,
          AccessToken: mockAccessToken,
          ExpiresIn: 3600,
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refresh_token=valid-refresh-token']);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken', mockAccessToken);
      expect(response.body).toHaveProperty('idToken', mockIdToken);
      expect(response.body).toHaveProperty('expiresIn', 3600);
    });

    it('should return 401 without refresh token cookie', async () => {
      const response = await request(app).post('/api/v1/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'No refresh token');
    });

    it('should return 401 with invalid refresh token', async () => {
      mockSend.mockResolvedValue({
        AuthenticationResult: null,
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refresh_token=invalid-token']);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Refresh token invalid');

      // Verify cookie is cleared
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const clearCookie = cookies.find((c: string) => c.startsWith('refresh_token=;'));
      expect(clearCookie).toBeDefined();
    });

    it('should clear cookie and return 401 on Cognito error', async () => {
      mockSend.mockRejectedValue(new Error('Token expired'));

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refresh_token=expired-token']);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Refresh failed');

      // Verify cookie is cleared
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear refresh token cookie', async () => {
      const response = await request(app).post('/api/v1/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Verify cookie is cleared
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const clearCookie = cookies.find((c: string) => c.startsWith('refresh_token=;'));
      expect(clearCookie).toBeDefined();
      expect(clearCookie).toContain('Path=/api/v1/auth');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register successfully with valid data', async () => {
      mockSend.mockResolvedValue({
        UserConfirmed: false,
        UserSub: 'new-user-sub',
      });

      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'New',
        surname: 'User',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('requiresVerification', true);
      expect(response.body).toHaveProperty(
        'message',
        'Registration successful. Please check your email to verify your account.'
      );
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        password: 'Password123!',
        name: 'New',
        surname: 'User',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'All fields required');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'newuser@example.com',
        name: 'New',
        surname: 'User',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'All fields required');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'newuser@example.com',
        password: 'Password123!',
        surname: 'User',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'All fields required');
    });

    it('should return 400 when surname is missing', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'New',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'All fields required');
    });

    it('should return 409 when email already exists', async () => {
      mockSend.mockRejectedValue({
        name: 'UsernameExistsException',
        message: 'User already exists',
      });

      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'existing@example.com',
        password: 'Password123!',
        name: 'Existing',
        surname: 'User',
      });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'Email already registered');
    });

    it('should return 400 when password is invalid', async () => {
      mockSend.mockRejectedValue({
        name: 'InvalidPasswordException',
        message: 'Password does not meet requirements',
      });

      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'newuser@example.com',
        password: 'weak',
        name: 'New',
        surname: 'User',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Password does not meet requirements');
    });

    it('should return 500 on unknown error', async () => {
      mockSend.mockRejectedValue(new Error('Unknown error occurred'));

      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'New',
        surname: 'User',
      });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Registration failed');
      expect(response.body).toHaveProperty('details');
    });
  });
});
