// ================================================================
// tests/unit/routes/authRoutes.test.ts
// Unit tests for authentication routes
// ================================================================

// Mock dependencies BEFORE imports
jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('axios');
jest.mock('../../../src/middleware/auth', () => {
  const actual = jest.requireActual('../../../src/middleware/auth');
  return {
    ...actual,
    UserService: {
      findOrCreateUser: jest.fn(),
    },
  };
});
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
jest.mock('../../../src/services/hooks/hookSystem', () => ({
  initializeHookSystem: jest.fn().mockResolvedValue(undefined),
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
import crypto from 'crypto';
import axios from 'axios';
import app from '../../../src/app';
import { CognitoIdentityProviderClient, SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import { UserService } from '../../../src/middleware/auth';
import { User } from '../../../src/models/User';
import { BASE_PATH } from '../../utils/apiBasePath';
import * as googleOAuth from '../../../src/services/auth/googleOAuth';

const mockCognitoClient = CognitoIdentityProviderClient as jest.MockedClass<
  typeof CognitoIdentityProviderClient
>;
const mockedAxios = axios as jest.Mocked<typeof axios>;
const verifyCognitoIdTokenSpy = jest.spyOn(googleOAuth, 'verifyCognitoIdToken');

const buildOAuthState = (platform: 'web' | 'mobile'): string => {
  const payload = Buffer.from(
    JSON.stringify({
      platform,
      nonce: 'test-nonce',
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
const TEST_PKCE_CHALLENGE =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_';

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

  describe(`POST ${BASE_PATH}/auth/login`, () => {
    const mockUser: Partial<User> = {
      id: 1,
      email: 'test@example.com',
      role: 'user',
      name: 'Test',
      surname: 'User',
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

      const response = await request(app)
        .post(`${BASE_PATH}/auth/login`)
        .send({ email: 'test@example.com', password: 'Password123!' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('accessToken', mockAccessToken);
      expect(response.body.data).toHaveProperty('idToken', mockIdToken);
      expect(response.body.data).toHaveProperty('expiresIn', 3600);
      expect(response.body).toHaveProperty('data.user');
      expect(response.body.data.user).toEqual({
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
      expect(refreshCookie).toContain(`Path=${BASE_PATH}/auth`);
    });

    it('should return 401 with invalid credentials', async () => {
      mockSend.mockRejectedValue({
        name: 'NotAuthorizedException',
        message: 'Incorrect username or password',
      });

      const response = await request(app)
        .post(`${BASE_PATH}/auth/login`)
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toHaveProperty('message', 'Invalid email or password');
    });

    it('should return 401 when user not found', async () => {
      mockSend.mockRejectedValue({
        name: 'UserNotFoundException',
        message: 'User does not exist',
      });

      const response = await request(app)
        .post(`${BASE_PATH}/auth/login`)
        .send({ email: 'nonexistent@example.com', password: 'Password123!' });

      expect(response.status).toBe(401);
      expect(response.body.error).toHaveProperty('message', 'User not found');
    });

    it('should return 400 without email', async () => {
      const response = await request(app)
        .post(`${BASE_PATH}/auth/login`)
        .send({ password: 'Password123!' });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message', 'Email and password required');
    });

    it('should return 400 without password', async () => {
      const response = await request(app)
        .post(`${BASE_PATH}/auth/login`)
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message', 'Email and password required');
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

      verifyCognitoIdTokenSpy.mockRejectedValueOnce(new Error('Token verification failed'));

      const response = await request(app)
        .post(`${BASE_PATH}/auth/login`)
        .send({ email: 'test@example.com', password: 'Password123!' });

      expect(response.status).toBe(401);
      expect(response.body.error).toHaveProperty('message', 'Invalid token');
    });
  });

  describe(`Google OAuth routes`, () => {
    beforeEach(() => {
      (UserService.findOrCreateUser as jest.Mock).mockResolvedValue({
        user: {
          id: 99,
          email: 'google@example.com',
          name: 'Google',
          surname: 'User',
          role: 'user',
          isActive: true,
        },
        isNewUser: false,
      });
      process.env['NODE_ENV'] = 'test';
      delete process.env['GOOGLE_OAUTH_REDIRECT_URIS_MOBILE'];
      delete process.env['GOOGLE_OAUTH_STATE_SECRET'];
    });

    it(`GET ${BASE_PATH}/auth/google/start should return authorize URL for mobile`, async () => {
      const response = await request(app)
        .get(`${BASE_PATH}/auth/google/start`)
        .query({
          platform: 'mobile',
          redirectUri: 'my-many-books://auth',
          codeChallenge: TEST_PKCE_CHALLENGE,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('authorizeUrl');
      expect(response.body.data.authorizeUrl).toContain('identity_provider=Google');
      expect(response.body.data.authorizeUrl).toContain('code_challenge=');
      expect(response.body.data).toHaveProperty('state');
    });

    it(`POST ${BASE_PATH}/auth/google/mobile/start should return authorize URL`, async () => {
      const response = await request(app).post(`${BASE_PATH}/auth/google/mobile/start`).send({
        redirectUri: 'my-many-books://auth',
        codeVerifier: TEST_PKCE_VERIFIER,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('authorizeUrl');
      expect(response.body.data.authorizeUrl).toContain('identity_provider=Google');
      expect(response.body.data.authorizeUrl).toContain('code_challenge=');
      expect(response.body.data).toHaveProperty('state');
    });

    it(`POST ${BASE_PATH}/auth/google/mobile/start should reject redirect URI in production when allowlist is missing`, async () => {
      process.env['NODE_ENV'] = 'production';
      delete process.env['GOOGLE_OAUTH_REDIRECT_URIS_MOBILE'];

      const response = await request(app).post(`${BASE_PATH}/auth/google/mobile/start`).send({
        redirectUri: 'my-many-books://auth',
        codeVerifier: TEST_PKCE_VERIFIER,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST_BODY');
    });

    it(`POST ${BASE_PATH}/auth/google/mobile/start should allow redirect URI in production when explicitly allowlisted`, async () => {
      process.env['NODE_ENV'] = 'production';
      process.env['GOOGLE_OAUTH_REDIRECT_URIS_MOBILE'] = 'my-many-books://auth';
      process.env['GOOGLE_OAUTH_STATE_SECRET'] = 'test-production-state-secret';

      const response = await request(app).post(`${BASE_PATH}/auth/google/mobile/start`).send({
        redirectUri: 'my-many-books://auth',
        codeVerifier: TEST_PKCE_VERIFIER,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('authorizeUrl');
    });

    it(`GET ${BASE_PATH}/auth/google/start should redirect for web`, async () => {
      const response = await request(app)
        .get(`${BASE_PATH}/auth/google/start`)
        .query({ platform: 'web' });

      expect(response.status).toBe(302);
      expect(response.headers['location']).toContain('/oauth2/authorize');
      expect(response.headers['location']).toContain('identity_provider=Google');
    });

    it(`GET ${BASE_PATH}/auth/google/start should derive Cognito domain from AWS_REGION when COGNITO_DOMAIN is not set`, async () => {
      delete process.env['COGNITO_DOMAIN'];
      process.env['AWS_REGION'] = 'us-west-2';
      process.env['NODE_ENV'] = 'development';

      const response = await request(app)
        .get(`${BASE_PATH}/auth/google/start`)
        .query({ platform: 'web' });

      expect(response.status).toBe(302);
      expect(response.headers['location']).toContain(
        'my-many-books-api-auth-dev.auth.us-west-2.amazoncognito.com'
      );
    });

    it(`GET ${BASE_PATH}/auth/google/start should use explicit COGNITO_DOMAIN when set`, async () => {
      process.env['COGNITO_DOMAIN'] = 'https://custom.auth.example.com';

      const response = await request(app)
        .get(`${BASE_PATH}/auth/google/start`)
        .query({ platform: 'web' });

      expect(response.status).toBe(302);
      expect(response.headers['location']).toContain('custom.auth.example.com');
    });

    it(`POST ${BASE_PATH}/auth/google/mobile/exchange should exchange OAuth code`, async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'google-access-token',
          id_token: 'google-id-token',
          refresh_token: 'google-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      } as never);

      verifyCognitoIdTokenSpy.mockResolvedValueOnce({
        sub: 'google-sub-123',
        email: 'google@example.com',
        email_verified: true,
        given_name: 'Google',
        family_name: 'User',
      });

      const response = await request(app).post(`${BASE_PATH}/auth/google/mobile/exchange`).send({
        code: 'oauth-code',
        state: buildOAuthState('mobile'),
        redirectUri: 'my-many-books://auth',
        codeVerifier: TEST_PKCE_VERIFIER,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        accessToken: 'google-access-token',
        idToken: 'google-id-token',
        expiresIn: 3600,
        user: {
          id: 99,
          email: 'google@example.com',
          name: 'Google',
          surname: 'User',
          role: 'user',
          isActive: true,
        },
      });

      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c: string) => c.startsWith('refresh_token='))).toBe(true);
    });

    it(`POST ${BASE_PATH}/auth/google/mobile/exchange should reject missing PKCE verifier`, async () => {
      const response = await request(app).post(`${BASE_PATH}/auth/google/mobile/exchange`).send({
        code: 'oauth-code',
        state: buildOAuthState('mobile'),
        redirectUri: 'my-many-books://auth',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REQUEST_BODY');
    });

    it(`GET ${BASE_PATH}/auth/google/callback should redirect to web auth on success`, async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'google-access-token',
          id_token: 'google-id-token',
          refresh_token: 'google-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      } as never);

      verifyCognitoIdTokenSpy.mockResolvedValueOnce({
        sub: 'google-sub-123',
        email: 'google@example.com',
        email_verified: true,
        given_name: 'Google',
        family_name: 'User',
      });

      const response = await request(app)
        .get(`${BASE_PATH}/auth/google/callback`)
        .set('Cookie', [`google_oauth_pkce_verifier=${TEST_PKCE_VERIFIER}`])
        .query({ code: 'oauth-code', state: buildOAuthState('web') });

      expect(response.status).toBe(302);
      expect(response.headers['location']).toBe('http://localhost:3000/auth?google=success');
    });

    it(`GET ${BASE_PATH}/auth/google/callback should redirect with error on invalid state`, async () => {
      const response = await request(app)
        .get(`${BASE_PATH}/auth/google/callback`)
        .query({ code: 'oauth-code', state: 'invalid-state' });

      expect(response.status).toBe(302);
      expect(response.headers['location']).toContain('google=error');
    });
  });

  describe(`POST ${BASE_PATH}/auth/refresh`, () => {
    const mockRefreshUser: Partial<User> = {
      id: 1,
      email: 'test@example.com',
      name: 'Test',
      surname: 'User',
      role: 'user',
      isActive: true,
    };

    beforeEach(() => {
      (UserService.findOrCreateUser as jest.Mock).mockResolvedValue({
        user: mockRefreshUser,
        isNewUser: false,
      });
    });

    it('should refresh token and return user from DB', async () => {
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
        .post(`${BASE_PATH}/auth/refresh`)
        .set('Cookie', ['refresh_token=valid-refresh-token']);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('accessToken', mockAccessToken);
      expect(response.body.data).toHaveProperty('idToken', mockIdToken);
      expect(response.body.data).toHaveProperty('expiresIn', 3600);
      expect(response.body.data.user).toMatchObject({
        id: mockRefreshUser.id,
        email: mockRefreshUser.email,
        role: mockRefreshUser.role,
      });
    });

    it('should return 401 when ID token verification fails after refresh', async () => {
      mockSend.mockResolvedValue({
        AuthenticationResult: {
          IdToken: 'bad.id.token',
          AccessToken: 'new.access.token',
          ExpiresIn: 3600,
        },
      });

      verifyCognitoIdTokenSpy.mockRejectedValueOnce(new Error('Invalid token'));

      const response = await request(app)
        .post(`${BASE_PATH}/auth/refresh`)
        .set('Cookie', ['refresh_token=valid-refresh-token']);

      expect(response.status).toBe(401);
      expect(response.body.error).toHaveProperty('message', 'Invalid token');
    });

    it('should return 401 without refresh token cookie', async () => {
      const response = await request(app).post(`${BASE_PATH}/auth/refresh`);

      expect(response.status).toBe(401);
      expect(response.body.error).toHaveProperty('message', 'No refresh token');
    });

    it('should return 401 with invalid refresh token', async () => {
      mockSend.mockResolvedValue({
        AuthenticationResult: null,
      });

      const response = await request(app)
        .post(`${BASE_PATH}/auth/refresh`)
        .set('Cookie', ['refresh_token=invalid-token']);

      expect(response.status).toBe(401);
      expect(response.body.error).toHaveProperty('message', 'Refresh token invalid');

      // Verify cookie is cleared
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const clearCookie = cookies.find((c: string) => c.startsWith('refresh_token=;'));
      expect(clearCookie).toBeDefined();
    });

    it('should clear cookie and return 401 on Cognito error', async () => {
      mockSend.mockRejectedValue(new Error('Token expired'));

      const response = await request(app)
        .post(`${BASE_PATH}/auth/refresh`)
        .set('Cookie', ['refresh_token=expired-token']);

      expect(response.status).toBe(401);
      expect(response.body.error).toHaveProperty('message', 'Refresh failed');

      // Verify cookie is cleared
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
    });
  });

  describe(`POST ${BASE_PATH}/auth/logout`, () => {
    it('should clear refresh token cookie', async () => {
      const response = await request(app).post(`${BASE_PATH}/auth/logout`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toMatchObject({ cognitoLogoutUrl: expect.any(String) });

      // Verify cookie is cleared
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const clearCookie = cookies.find((c: string) => c.startsWith('refresh_token=;'));
      expect(clearCookie).toBeDefined();
      expect(clearCookie).toContain(`Path=${BASE_PATH}/auth`);
    });
  });

  describe(`POST ${BASE_PATH}/auth/register`, () => {
    it('should register successfully with valid data', async () => {
      mockSend.mockResolvedValue({
        UserConfirmed: false,
        UserSub: 'new-user-sub',
      });

      const response = await request(app).post(`${BASE_PATH}/auth/register`).send({
        email: 'newuser@example.com',
              password: 'Password123!',
        name: 'New',
        surname: 'User',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('requiresVerification', true);
      expect(response.body).toHaveProperty(
        'message',
        'Registration successful. Please check your email to verify your account.'
      );
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app).post(`${BASE_PATH}/auth/register`).send({
        password: 'Password123!',
        name: 'New',
        surname: 'User',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message', 'All fields required');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app).post(`${BASE_PATH}/auth/register`).send({
        email: 'newuser@example.com',
      role: 'user',
        name: 'New',
        surname: 'User',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message', 'All fields required');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app).post(`${BASE_PATH}/auth/register`).send({
        email: 'newuser@example.com',
              password: 'Password123!',
        surname: 'User',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message', 'All fields required');
    });

    it('should return 400 when surname is missing', async () => {
      const response = await request(app).post(`${BASE_PATH}/auth/register`).send({
        email: 'newuser@example.com',
      role: 'user',
        password: 'Password123!',
        name: 'New',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message', 'All fields required');
    });

    it('should return 409 when email already exists', async () => {
      mockSend.mockRejectedValue({
        name: 'UsernameExistsException',
        message: 'User already exists',
      });

      const response = await request(app).post(`${BASE_PATH}/auth/register`).send({
        email: 'existing@example.com',
              password: 'Password123!',
        name: 'Existing',
        surname: 'User',
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toHaveProperty('message', 'Email already registered');
    });

    it('should return 400 when password is invalid', async () => {
      mockSend.mockRejectedValue({
        name: 'InvalidPasswordException',
        message: 'Password does not meet requirements',
      });

      const response = await request(app).post(`${BASE_PATH}/auth/register`).send({
        email: 'newuser@example.com',
      role: 'user',
        password: 'weak',
        name: 'New',
        surname: 'User',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message', 'Password does not meet requirements');
    });

    it('should return 500 on unknown error', async () => {
      mockSend.mockRejectedValue(new Error('Unknown error occurred'));

      const response = await request(app).post(`${BASE_PATH}/auth/register`).send({
        email: 'newuser@example.com',
              password: 'Password123!',
        name: 'New',
        surname: 'User',
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toHaveProperty('message', 'Registration failed');
      expect(response.body.error).toHaveProperty('details');
    });

    it('should include locale in UserAttributes when provided', async () => {
      mockSend.mockResolvedValue({ UserConfirmed: false, UserSub: 'new-user-sub' });

      await request(app).post(`${BASE_PATH}/auth/register`).send({
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'New',
        surname: 'User',
        locale: 'it',
      });

      const MockSignUpCommand = SignUpCommand as jest.MockedClass<typeof SignUpCommand>;
      const constructorInput = MockSignUpCommand.mock.calls[0]![0]!
      expect(constructorInput.UserAttributes).toContainEqual({ Name: 'locale', Value: 'it' });
    });

    it('should not include locale in UserAttributes when omitted', async () => {
      mockSend.mockResolvedValue({ UserConfirmed: false, UserSub: 'new-user-sub' });

      await request(app).post(`${BASE_PATH}/auth/register`).send({
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'New',
        surname: 'User',
      });

      const MockSignUpCommand = SignUpCommand as jest.MockedClass<typeof SignUpCommand>;
      const constructorInput = MockSignUpCommand.mock.calls[0]![0]!
      const localeAttr = constructorInput.UserAttributes?.find(
        (a) => a.Name === 'locale'
      );
      expect(localeAttr).toBeUndefined();
    });
  });

  describe(`POST ${BASE_PATH}/auth/verify-email`, () => {
    it('should verify email successfully', async () => {
      mockSend.mockResolvedValue({});

      const response = await request(app).post(`${BASE_PATH}/auth/verify-email`).send({
        email: 'user@example.com',
        code: '123456',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('verified', true);
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app).post(`${BASE_PATH}/auth/verify-email`).send({
        code: '123456',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message', 'Email and verification code are required');
    });

    it('should return 400 when code is missing', async () => {
      const response = await request(app).post(`${BASE_PATH}/auth/verify-email`).send({
        email: 'user@example.com',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message', 'Email and verification code are required');
    });

    it('should return 400 for invalid code', async () => {
      mockSend.mockRejectedValue({ name: 'CodeMismatchException', message: 'Invalid code' });

      const response = await request(app).post(`${BASE_PATH}/auth/verify-email`).send({
        email: 'user@example.com',
        code: '000000',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message', 'Invalid verification code');
    });

    it('should return 400 for expired code', async () => {
      mockSend.mockRejectedValue({ name: 'ExpiredCodeException', message: 'Code expired' });

      const response = await request(app).post(`${BASE_PATH}/auth/verify-email`).send({
        email: 'user@example.com',
        code: '123456',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message', 'Verification code has expired');
    });

    it('should return 400 for already verified account', async () => {
      mockSend.mockRejectedValue({ name: 'NotAuthorizedException', message: 'Already confirmed' });

      const response = await request(app).post(`${BASE_PATH}/auth/verify-email`).send({
        email: 'user@example.com',
        code: '123456',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message', 'Account already verified');
    });

    it('should return 404 for non-existent user', async () => {
      mockSend.mockRejectedValue({ name: 'UserNotFoundException', message: 'User not found' });

      const response = await request(app).post(`${BASE_PATH}/auth/verify-email`).send({
        email: 'nonexistent@example.com',
        code: '123456',
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('message', 'User not found');
    });
  });

  describe(`POST ${BASE_PATH}/auth/resend-code`, () => {
    it('should resend verification code successfully', async () => {
      mockSend.mockResolvedValue({});

      const response = await request(app).post(`${BASE_PATH}/auth/resend-code`).send({
        email: 'user@example.com',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('sent', true);
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app).post(`${BASE_PATH}/auth/resend-code`).send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message', 'Email is required');
    });

    it('should return 404 for non-existent user', async () => {
      mockSend.mockRejectedValue({ name: 'UserNotFoundException', message: 'User not found' });

      const response = await request(app).post(`${BASE_PATH}/auth/resend-code`).send({
        email: 'nonexistent@example.com',
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toHaveProperty('message', 'User not found');
    });

    it('should return 429 for rate limit exceeded', async () => {
      mockSend.mockRejectedValue({ name: 'LimitExceededException', message: 'Too many attempts' });

      const response = await request(app).post(`${BASE_PATH}/auth/resend-code`).send({
        email: 'user@example.com',
      });

      expect(response.status).toBe(429);
      expect(response.body.error).toHaveProperty('message', 'Too many requests. Please try again later.');
    });

    it('should return 500 for code delivery failure', async () => {
      mockSend.mockRejectedValue({ name: 'CodeDeliveryFailureException', message: 'Delivery failed' });

      const response = await request(app).post(`${BASE_PATH}/auth/resend-code`).send({
        email: 'user@example.com',
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toHaveProperty('message', 'Failed to deliver verification code');
    });
  });

  describe(`POST ${BASE_PATH}/auth/forgot-password`, () => {
    it('returns accepted response for valid request', async () => {
      mockSend.mockResolvedValue({});

      const response = await request(app).post(`${BASE_PATH}/auth/forgot-password`).send({
        email: 'user@example.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        accepted: true,
        expiresInMinutes: 60,
      });
    });

    it('does not reveal whether the user exists', async () => {
      mockSend.mockRejectedValue({ name: 'UserNotFoundException', message: 'User does not exist' });

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
  });

  describe(`POST ${BASE_PATH}/auth/confirm-forgot-password`, () => {
    it('confirms reset code and updates password', async () => {
      mockSend.mockResolvedValueOnce({}).mockResolvedValueOnce({});

      const response = await request(app).post(`${BASE_PATH}/auth/confirm-forgot-password`).send({
        email: 'user@example.com',
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

    it('returns validation error for invalid code', async () => {
      mockSend.mockRejectedValue({ name: 'CodeMismatchException', message: 'Invalid code' });

      const response = await request(app).post(`${BASE_PATH}/auth/confirm-forgot-password`).send({
        email: 'user@example.com',
        code: '000000',
        newPassword: 'NewPass123',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message', 'Invalid reset code');
    });
  });
});
