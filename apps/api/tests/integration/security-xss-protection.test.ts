// ================================================================
// tests/security/xss-protection.test.ts
// Security tests for XSS protection
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

describe('XSS Protection Tests', () => {
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

  describe('Token storage protection', () => {
    it('should not expose refresh token in response body', async () => {
      const mockIdToken = 'mock.id.token';
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';

      // Mock jwt decode
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

      expect(response.status).toBe(200);

      // Refresh token should NOT be in JSON response (XSS protection)
      expect(response.body).not.toHaveProperty('refreshToken');
      expect(response.body).not.toHaveProperty('RefreshToken');
      expect(JSON.stringify(response.body)).not.toContain(mockRefreshToken);

      // But access token CAN be in response (will be stored in memory only)
      expect(response.body).toHaveProperty('accessToken', mockAccessToken);
    });

    it('should store refresh token in HttpOnly cookie', async () => {
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
      expect(cookies).toBeDefined();

      const refreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();

      // Critical: HttpOnly flag prevents JavaScript access (XSS protection)
      expect(refreshCookie).toContain('HttpOnly');
    });

    it('should set proper cookie security flags', async () => {
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

      // HttpOnly: Prevents XSS attacks
      expect(refreshCookie).toContain('HttpOnly');

      // SameSite: Prevents CSRF attacks
      expect(refreshCookie).toContain('SameSite=Strict');

      // Path restriction: Limits cookie scope
      expect(refreshCookie).toContain('Path=/api/v1/auth');

      // Max-Age: 7 days expiration
      expect(refreshCookie).toMatch(/Max-Age=\d+/);
    });
  });

  describe('XSS attack prevention', () => {
    it('should sanitize malicious input in login', async () => {
      const xssPayload = '<script>alert("XSS")</script>';

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: xssPayload, password: 'Password123!' });

      // Should reject invalid email format
      expect(response.status).not.toBe(200);

      // Response should not contain the XSS payload
      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });

    it('should sanitize malicious input in registration', async () => {
      const xssPayload = '<img src=x onerror=alert(1)>';

      mockSend.mockResolvedValue({
        UserConfirmed: false,
        UserSub: 'new-user-sub',
      });

      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'Password123!',
        name: xssPayload,
        surname: 'User',
      });

      // Even if registration succeeds, response should not echo malicious content
      expect(JSON.stringify(response.body)).not.toContain('<img');
      expect(JSON.stringify(response.body)).not.toContain('onerror');
    });
  });

  describe('Token exposure prevention', () => {
    it('should not leak tokens in error messages', async () => {
      mockSend.mockRejectedValue(new Error('Authentication failed'));

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' });

      expect(response.status).toBe(500);

      // Error response should not contain sensitive tokens
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/);
    });

    it('should clear sensitive data on logout', async () => {
      const response = await request(app).post('/api/v1/auth/logout');

      expect(response.status).toBe(200);

      const cookies = response.headers['set-cookie'] as unknown as string[];
      const clearCookie = cookies.find((c: string) => c.startsWith('refresh_token=;'));

      expect(clearCookie).toBeDefined();

      // Cookie should be properly cleared (empty value)
      expect(clearCookie).toMatch(/^refresh_token=;/);
    });
  });

  describe('Content Security Policy headers', () => {
    it('should not include sensitive data in response headers', async () => {
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

      // Ensure tokens are not leaked in custom headers
      const headerKeys = Object.keys(response.headers);
      headerKeys.forEach((key) => {
        const value = response.headers[key];
        if (key !== 'set-cookie' && typeof value === 'string') {
          expect(value).not.toContain(mockRefreshToken);
        }
      });
    });
  });
});
