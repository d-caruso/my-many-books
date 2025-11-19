// ================================================================
// tests/integration/auth-flow.test.ts
// Integration tests for complete authentication flow
// ================================================================

// Mock dependencies BEFORE imports
jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('../../src/config/database', () => ({
  default: {
    getInstance: jest.fn().mockReturnValue({
      authenticate: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));
jest.mock('../../src/models', () => ({
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
jest.mock('../../src/middleware/auth', () => {
  const actual = jest.requireActual('../../src/middleware/auth');
  return {
    ...actual,
    UserService: {
      findOrCreateUser: jest.fn().mockResolvedValue({
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test',
          surname: 'User',
          role: 'user',
          isActive: true,
        },
        isNewUser: false,
      }),
    },
  };
});
jest.mock('jsonwebtoken');

import request from 'supertest';
import app from '../../src/app';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

const mockCognitoClient = CognitoIdentityProviderClient as jest.MockedClass<
  typeof CognitoIdentityProviderClient
>;

describe('Authentication Flow Integration', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let mockSend: jest.Mock;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend = jest.fn();
    mockCognitoClient.prototype.send = mockSend;
  });

  describe('Complete auth flow: login → authenticated request → refresh → logout', () => {
    it('should complete full authentication lifecycle', async () => {
      const mockIdToken = 'mock.id.token';
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';
      const newAccessToken = 'new.access.token';
      const newIdToken = 'new.id.token';

      // Mock jwt decode
      const jwt = require('jsonwebtoken');
      jwt.decode = jest.fn().mockReturnValue({
        sub: 'cognito-user-123',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
      });

      // Step 1: Login
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          IdToken: mockIdToken,
          AccessToken: mockAccessToken,
          RefreshToken: mockRefreshToken,
          ExpiresIn: 3600,
        },
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('accessToken', mockAccessToken);
      expect(loginResponse.body).toHaveProperty('user');

      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.startsWith('refresh_token='))).toBe(true);

      // Step 2: Make authenticated request (simulated - would need real protected route)
      // In a real scenario, this would call a protected endpoint with the access token

      // Step 3: Refresh token
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          IdToken: newIdToken,
          AccessToken: newAccessToken,
          ExpiresIn: 3600,
        },
      });

      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies);

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('accessToken', newAccessToken);
      expect(refreshResponse.body).toHaveProperty('idToken', newIdToken);

      // Step 4: Logout
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body).toHaveProperty('success', true);

      const logoutCookies = logoutResponse.headers['set-cookie'] as unknown as string[];
      expect(logoutCookies).toBeDefined();
      const clearCookie = logoutCookies.find((c: string) => c.startsWith('refresh_token=;'));
      expect(clearCookie).toBeDefined();
    });
  });

  describe('Token expiration and refresh flow', () => {
    it('should handle token expiration and automatic refresh', async () => {
      const mockRefreshToken = 'valid.refresh.token';
      const newAccessToken = 'new.access.token';
      const newIdToken = 'new.id.token';

      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          IdToken: newIdToken,
          AccessToken: newAccessToken,
          ExpiresIn: 3600,
        },
      });

      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refresh_token=${mockRefreshToken}`]);

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('accessToken', newAccessToken);
    });

    it('should reject expired refresh token', async () => {
      mockSend.mockRejectedValueOnce({
        name: 'NotAuthorizedException',
        message: 'Refresh token expired',
      });

      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refresh_token=expired.token']);

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body).toHaveProperty('error');
    });
  });

  describe('Registration and verification flow', () => {
    it('should register new user successfully', async () => {
      mockSend.mockResolvedValueOnce({
        UserConfirmed: false,
        UserSub: 'new-user-sub-123',
      });

      const registerResponse = await request(app).post('/api/v1/auth/register').send({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New',
        surname: 'User',
      });

      expect(registerResponse.status).toBe(200);
      expect(registerResponse.body).toHaveProperty('success', true);
      expect(registerResponse.body).toHaveProperty('requiresVerification', true);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle network errors gracefully', async () => {
      mockSend.mockRejectedValueOnce(new Error('Network error'));

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' });

      expect(loginResponse.status).toBe(500);
      expect(loginResponse.body).toHaveProperty('error');
    });

    it('should prevent login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email and password required');
    });

    it('should clear cookies on failed refresh', async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: null,
      });

      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refresh_token=invalid.token']);

      expect(refreshResponse.status).toBe(401);

      const cookies = refreshResponse.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const clearCookie = cookies.find((c: string) => c.startsWith('refresh_token=;'));
      expect(clearCookie).toBeDefined();
    });
  });

  describe('Session management', () => {
    it('should maintain session across multiple requests', async () => {
      const mockIdToken = 'session.id.token';
      const mockAccessToken = 'session.access.token';
      const mockRefreshToken = 'session.refresh.token';

      // Mock jwt decode
      const jwt = require('jsonwebtoken');
      jwt.decode = jest.fn().mockReturnValue({
        sub: 'user-session-123',
        email: 'session@example.com',
        given_name: 'Session',
        family_name: 'User',
      });

      mockSend.mockResolvedValueOnce({
        AuthenticationResult: {
          IdToken: mockIdToken,
          AccessToken: mockAccessToken,
          RefreshToken: mockRefreshToken,
          ExpiresIn: 3600,
        },
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'session@example.com', password: 'Password123!' });

      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];

      // Multiple refresh calls with same cookie
      for (let i = 0; i < 3; i++) {
        mockSend.mockResolvedValueOnce({
          AuthenticationResult: {
            IdToken: `refresh.id.token.${i}`,
            AccessToken: `refresh.access.token.${i}`,
            ExpiresIn: 3600,
          },
        });

        const refreshResponse = await request(app)
          .post('/api/v1/auth/refresh')
          .set('Cookie', cookies);

        expect(refreshResponse.status).toBe(200);
        expect(refreshResponse.body).toHaveProperty('accessToken');
      }
    });
  });
});
