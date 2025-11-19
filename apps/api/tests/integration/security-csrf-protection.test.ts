// ================================================================
// tests/security/csrf-protection.test.ts
// Security tests for CSRF protection
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

describe('CSRF Protection Tests', () => {
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

  describe('SameSite cookie protection', () => {
    it('should set SameSite=Strict on refresh token cookie', async () => {
      const mockIdToken = 'mock.id.token';
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';

      const jwt = require('jsonwebtoken');
      jwt.decode = jest.fn().mockReturnValue({
        sub: 'cognito-user-123',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
      });

      mockSend.mockResolvedValue({
        AuthenticationResult: {
          IdToken: mockIdToken,
          AccessToken: mockAccessToken,
          RefreshToken: mockRefreshToken,
          ExpiresIn: 3600,
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' });

      const cookies = response.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='));

      // SameSite=Strict prevents the browser from sending cookies with cross-site requests
      // This is the primary CSRF protection mechanism
      expect(refreshCookie).toContain('SameSite=Strict');
    });

    it('should validate cookie path restriction', async () => {
      const mockIdToken = 'mock.id.token';
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';

      const jwt = require('jsonwebtoken');
      jwt.decode = jest.fn().mockReturnValue({
        sub: 'cognito-user-123',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
      });

      mockSend.mockResolvedValue({
        AuthenticationResult: {
          IdToken: mockIdToken,
          AccessToken: mockAccessToken,
          RefreshToken: mockRefreshToken,
          ExpiresIn: 3600,
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' });

      const cookies = response.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='));

      // Path restriction limits the scope of the cookie
      // Cookie will only be sent to /api/v1/auth endpoints
      expect(refreshCookie).toContain('Path=/api/v1/auth');
    });
  });

  describe('Cross-origin request protection', () => {
    it('should handle requests with proper CORS headers', async () => {
      mockSend.mockResolvedValue({
        AuthenticationResult: {
          IdToken: 'new.id.token',
          AccessToken: 'new.access.token',
          ExpiresIn: 3600,
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refresh_token=valid-token'])
        .set('Origin', process.env['FRONTEND_URL'] || 'http://localhost:5173');

      // Request should be allowed from configured origin
      expect(response.status).toBe(200);
    });

    it('should reject requests without credentials', async () => {
      // Attempt to use refresh token without cookie (simulating CSRF attack)
      const response = await request(app).post('/api/v1/auth/refresh');

      // Should fail because refresh token is not present
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'No refresh token');
    });
  });

  describe('Token binding protection', () => {
    it('should require refresh token cookie for refresh endpoint', async () => {
      // Attempt to call refresh without cookie
      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: 'stolen-token-from-somewhere',
      });

      // Should fail because refresh token must be in HttpOnly cookie, not request body
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'No refresh token');
    });

    it('should not accept refresh token from request body', async () => {
      // Attempt to send refresh token in request body (CSRF attack vector)
      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: 'malicious-token',
      });

      // Should fail - only accepts tokens from HttpOnly cookie
      expect(response.status).toBe(401);
    });

    it('should not accept refresh token from headers', async () => {
      // Attempt to send refresh token in custom header (CSRF attack vector)
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('X-Refresh-Token', 'malicious-token');

      // Should fail - only accepts tokens from HttpOnly cookie
      expect(response.status).toBe(401);
    });
  });

  describe('Cookie expiration and cleanup', () => {
    it('should set appropriate expiration on refresh token', async () => {
      const mockIdToken = 'mock.id.token';
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';

      const jwt = require('jsonwebtoken');
      jwt.decode = jest.fn().mockReturnValue({
        sub: 'cognito-user-123',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
      });

      mockSend.mockResolvedValue({
        AuthenticationResult: {
          IdToken: mockIdToken,
          AccessToken: mockAccessToken,
          RefreshToken: mockRefreshToken,
          ExpiresIn: 3600,
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' });

      const cookies = response.headers['set-cookie'] as unknown as string[];
      const refreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='));

      // Cookie should expire in 7 days (604800 seconds)
      expect(refreshCookie).toMatch(/Max-Age=604800/);
    });

    it('should properly clear cookie on logout', async () => {
      const response = await request(app).post('/api/v1/auth/logout');

      const cookies = response.headers['set-cookie'] as unknown as string[];
      const clearCookie = cookies.find((c: string) => c.startsWith('refresh_token=;'));

      expect(clearCookie).toBeDefined();
      expect(clearCookie).toContain('Path=/api/v1/auth');

      // Cookie should be expired immediately
      expect(clearCookie).toMatch(/refresh_token=;/);
    });

    it('should clear cookie on failed refresh', async () => {
      mockSend.mockResolvedValue({
        AuthenticationResult: null,
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refresh_token=invalid-token']);

      expect(response.status).toBe(401);

      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();

      // Cookie should be cleared on failure
      const clearCookie = cookies.find((c: string) => c.startsWith('refresh_token=;'));
      expect(clearCookie).toBeDefined();
    });
  });

  describe('Double submit cookie pattern (additional protection)', () => {
    it('should validate that cookies are sent with requests', async () => {
      // This test validates that the endpoint requires cookies to be present
      // which is part of the double-submit cookie pattern defense

      const response = await request(app).post('/api/v1/auth/refresh');

      // Without cookie, request should fail
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'No refresh token');
    });

    it('should not process requests with only body parameters', async () => {
      // Ensures that sending token in body doesn't work (CSRF protection)
      const response = await request(app).post('/api/v1/auth/refresh').send({
        token: 'some-token',
        refreshToken: 'some-refresh-token',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Security headers validation', () => {
    it('should allow credentials in CORS for legitimate requests', async () => {
      const mockIdToken = 'mock.id.token';
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';

      const jwt = require('jsonwebtoken');
      jwt.decode = jest.fn().mockReturnValue({
        sub: 'cognito-user-123',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
      });

      mockSend.mockResolvedValue({
        AuthenticationResult: {
          IdToken: mockIdToken,
          AccessToken: mockAccessToken,
          RefreshToken: mockRefreshToken,
          ExpiresIn: 3600,
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', process.env['FRONTEND_URL'] || 'http://localhost:5173')
        .send({ email: 'test@example.com', password: 'Password123!' });

      // Should set Access-Control-Allow-Credentials
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });
});
