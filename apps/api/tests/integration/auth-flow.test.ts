// ================================================================
// tests/integration/auth-flow.test.ts
// Integration tests for complete authentication flow
// ================================================================

// Mock dependencies BEFORE imports
jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('axios');
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
      role: 'user',
          name: 'Test',
          surname: 'User',
                    isActive: true,
        },
        isNewUser: false,
      }),
    },
  };
});

import request from 'supertest';
import crypto from 'crypto';
import axios from 'axios';
import app from '../../src/app';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { UserService } from '../../src/middleware/auth';
import { BASE_PATH } from '../utils/apiBasePath';
import * as googleOAuth from '../../src/services/auth/googleOAuth';

const mockCognitoClient = CognitoIdentityProviderClient as jest.MockedClass<
  typeof CognitoIdentityProviderClient
>;
const mockedAxios = axios as jest.Mocked<typeof axios>;
const verifyCognitoIdTokenSpy = jest.spyOn(googleOAuth, 'verifyCognitoIdToken');

const buildOAuthState = (platform: 'web' | 'mobile'): string => {
  const payload = Buffer.from(
    JSON.stringify({
      platform,
      nonce: 'integration-nonce',
      ts: Date.now(),
    }),
    'utf8'
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', 'local-google-oauth-state')
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
};

const TEST_PKCE_VERIFIER =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';

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
    mockedAxios.post.mockReset();
    verifyCognitoIdTokenSpy.mockResolvedValue({
      sub: 'cognito-user-123',
      email: 'test@example.com',
      given_name: 'Test',
      family_name: 'User',
      email_verified: true,
    });

    process.env['COGNITO_DOMAIN'] = 'https://auth.example.com';
    process.env['COGNITO_USER_POOL_CLIENT_ID'] = 'test-client-id';
    process.env['COGNITO_USER_POOL_ID'] = 'test-pool-id';
    process.env['FRONTEND_URL'] = 'http://localhost:3000';
    process.env['GOOGLE_OAUTH_REDIRECT_URI_MOBILE_PREFIX'] = 'my-many-books://';
  });

  describe('Complete auth flow: login → authenticated request → refresh → logout', () => {
    it('should complete full authentication lifecycle', async () => {
      const mockIdToken = 'mock.id.token';
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';
      const newAccessToken = 'new.access.token';
      const newIdToken = 'new.id.token';

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
        .post(`${BASE_PATH}/auth/login`)
        .send({ email: 'test@example.com', password: 'Password123!' });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('data.accessToken', mockAccessToken);
      expect(loginResponse.body).toHaveProperty('data.user');

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
        .post(`${BASE_PATH}/auth/refresh`)
        .set('Cookie', cookies);

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('data.accessToken', newAccessToken);
      expect(refreshResponse.body).toHaveProperty('data.idToken', newIdToken);

      // Step 4: Logout
      const logoutResponse = await request(app)
        .post(`${BASE_PATH}/auth/logout`)
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
        .post(`${BASE_PATH}/auth/refresh`)
        .set('Cookie', [`refresh_token=${mockRefreshToken}`]);

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('data.accessToken', newAccessToken);
    });

    it('should reject expired refresh token', async () => {
      mockSend.mockRejectedValueOnce({
        name: 'NotAuthorizedException',
        message: 'Refresh token expired',
      });

      const refreshResponse = await request(app)
        .post(`${BASE_PATH}/auth/refresh`)
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

      const registerResponse = await request(app).post(`${BASE_PATH}/auth/register`).send({
        email: 'newuser@example.com',
              password: 'SecurePass123!',
        name: 'New',
        surname: 'User',
      });

      expect(registerResponse.status).toBe(200);
      expect(registerResponse.body).toHaveProperty('success', true);
      expect(registerResponse.body).toHaveProperty('data.requiresVerification', true);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle network errors gracefully', async () => {
      mockSend.mockRejectedValueOnce(new Error('Network error'));

      const loginResponse = await request(app)
        .post(`${BASE_PATH}/auth/login`)
        .send({ email: 'test@example.com', password: 'Password123!' });

      expect(loginResponse.status).toBe(500);
      expect(loginResponse.body).toHaveProperty('error');
    });

    it('should prevent login with missing credentials', async () => {
      const response = await request(app)
        .post(`${BASE_PATH}/auth/login`)
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error.message', 'Email and password required');
    });

    it('should clear cookies on failed refresh', async () => {
      mockSend.mockResolvedValueOnce({
        AuthenticationResult: null,
      });

      const refreshResponse = await request(app)
        .post(`${BASE_PATH}/auth/refresh`)
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

      verifyCognitoIdTokenSpy.mockResolvedValueOnce({
        sub: 'user-session-123',
        email: 'session@example.com',
        given_name: 'Session',
        family_name: 'User',
        email_verified: true,
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
        .post(`${BASE_PATH}/auth/login`)
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
          .post(`${BASE_PATH}/auth/refresh`)
          .set('Cookie', cookies);

        expect(refreshResponse.status).toBe(200);
        expect(refreshResponse.body).toHaveProperty('data.accessToken');
      }
    });
  });

  describe('Password reset flow', () => {
    it('accepts forgot-password requests without leaking account existence', async () => {
      mockSend.mockRejectedValueOnce({
        name: 'UserNotFoundException',
        message: 'User does not exist',
      });

      const response = await request(app).post(`${BASE_PATH}/auth/forgot-password`).send({
        email: 'missing@example.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        accepted: true,
        expiresInMinutes: 60,
      });
    });

    it('confirms forgot-password with code and invalidates existing sessions', async () => {
      mockSend.mockResolvedValueOnce({}).mockResolvedValueOnce({});

      const response = await request(app).post(`${BASE_PATH}/auth/confirm-forgot-password`).send({
        email: 'test@example.com',
        code: '123456',
        newPassword: 'NewPass123',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        reset: true,
        signInRequired: true,
      });
    });
  });

  describe('Google OAuth flow', () => {
    it('should complete mobile OAuth exchange', async () => {
      verifyCognitoIdTokenSpy.mockResolvedValueOnce({
        sub: 'google-sub-001',
        email: 'google@example.com',
        email_verified: true,
        given_name: 'Google',
        family_name: 'User',
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'google-access-token',
          id_token: 'google-id-token',
          refresh_token: 'google-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      } as never);

      const response = await request(app).post(`${BASE_PATH}/auth/google/mobile/exchange`).send({
        code: 'oauth-code',
        state: buildOAuthState('mobile'),
        redirectUri: 'my-many-books://auth',
        codeVerifier: TEST_PKCE_VERIFIER,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken', 'google-access-token');
      expect(response.body.data).toHaveProperty('idToken', 'google-id-token');
      expect(response.body.data).toHaveProperty('user');
      expect(UserService.findOrCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'google-sub-001',
          email: 'google@example.com',
        }),
        'google'
      );
    });

    it('should pass Google provider subject for account linking when identities are present', async () => {
      verifyCognitoIdTokenSpy.mockResolvedValueOnce({
        sub: 'cognito-sub-001',
        email: 'google.link@example.com',
        email_verified: true,
        given_name: 'Google',
        family_name: 'Linked',
        identities: [
          {
            providerName: 'Google',
            providerType: 'Google',
            userId: 'google-provider-sub-001',
          },
        ],
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'google-access-token',
          id_token: 'google-id-token',
          refresh_token: 'google-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      } as never);

      const response = await request(app).post(`${BASE_PATH}/auth/google/mobile/exchange`).send({
        code: 'oauth-code',
        state: buildOAuthState('mobile'),
        redirectUri: 'my-many-books://auth',
        codeVerifier: TEST_PKCE_VERIFIER,
      });

      expect(response.status).toBe(200);
      expect(UserService.findOrCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cognito-sub-001',
          providerUserId: 'google-provider-sub-001',
          email: 'google.link@example.com',
        }),
        'google'
      );
    });

    it('should reject mobile OAuth exchange with invalid state', async () => {
      const response = await request(app).post(`${BASE_PATH}/auth/google/mobile/exchange`).send({
        code: 'oauth-code',
        state: 'invalid-state',
        redirectUri: 'my-many-books://auth',
        codeVerifier: TEST_PKCE_VERIFIER,
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
    });
  });
});
