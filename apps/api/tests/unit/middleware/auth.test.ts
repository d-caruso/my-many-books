// ================================================================
// tests/middleware/auth.test.ts
// Unit tests for authentication middleware and providers
// ================================================================

import { NextFunction, Response } from 'express';
import {
  authMiddleware,
  optionalAuthMiddleware,
  AuthProviderFactory,
  CognitoAuthProvider,
  Auth0Provider,
  UserService,
  AuthenticatedRequest,
  AuthProvider,
  AuthProviderUser,
  resetAuthProvider,
} from '../../../src/middleware/auth';
import { clearUserCache } from '../../../src/middleware/authCache';
import { CognitoJwtVerifier } from '../../../src/services/auth/cognitoJwtVerifier';

describe('Authentication Middleware', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    jest.clearAllMocks();
    clearUserCache();
    resetAuthProvider();
  });

  describe('authMiddleware', () => {
    it('rejects requests without Authorization header', async () => {
      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_HEADER_INVALID',
          message: 'Authentication error. Please log in again',
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects requests with invalid Authorization format', async () => {
      req.headers!.authorization = 'InvalidFormat token';

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_HEADER_INVALID',
          message: 'Authentication error. Please log in again',
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('processes valid token successfully', async () => {
      const mockToken = 'valid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;

      const mockProviderUser: AuthProviderUser = {
        id: 'provider123',
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
      };

      const mockDbUser = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
        name: 'John',
        surname: 'Doe',
        isActive: true,
      };

      const mockProvider: jest.Mocked<AuthProvider> = {
        verifyToken: jest.fn().mockResolvedValue(mockProviderUser),
        getProviderName: jest.fn().mockReturnValue('cognito'),
      };

      jest.spyOn(AuthProviderFactory, 'createProvider').mockReturnValue(mockProvider);
      jest.spyOn(UserService, 'findOrCreateUser').mockResolvedValue({
        user: mockDbUser as never,
        isNewUser: false,
      });

      process.env['AUTH_PROVIDER'] = 'cognito';

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(mockProvider.verifyToken).toHaveBeenCalledWith(mockToken);
      expect(UserService.findOrCreateUser).toHaveBeenCalledWith(mockProviderUser, 'cognito');
      expect(req.user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'user',
        provider: 'cognito',
        providerUserId: 'provider123',
        isNewUser: false,
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects deactivated users', async () => {
      const mockToken = 'valid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;

      const mockProviderUser: AuthProviderUser = {
        id: 'provider123',
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
      };

      const mockDbUser = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
        name: 'John',
        surname: 'Doe',
        isActive: false,
      };

      const mockProvider: jest.Mocked<AuthProvider> = {
        verifyToken: jest.fn().mockResolvedValue(mockProviderUser),
        getProviderName: jest.fn().mockReturnValue('cognito'),
      };

      jest.spyOn(AuthProviderFactory, 'createProvider').mockReturnValue(mockProvider);
      jest.spyOn(UserService, 'findOrCreateUser').mockResolvedValue({
        user: mockDbUser as never,
        isNewUser: false,
      });

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been deactivated',
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when token verification fails', async () => {
      const mockToken = 'invalid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;

      const mockProvider: jest.Mocked<AuthProvider> = {
        verifyToken: jest.fn().mockRejectedValue(new Error('Token verification failed')),
        getProviderName: jest.fn().mockReturnValue('cognito'),
      };

      jest.spyOn(AuthProviderFactory, 'createProvider').mockReturnValue(mockProvider);

      await authMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message: 'Authentication failed. Please try again',
          details: { details: 'Token verification failed' },
        },
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('continues without authentication when no header is provided', async () => {
      await optionalAuthMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('continues without authentication when header format is invalid', async () => {
      req.headers!.authorization = 'InvalidFormat token';

      await optionalAuthMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('authenticates when valid header is provided', async () => {
      const mockToken = 'valid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;

      const mockProviderUser: AuthProviderUser = {
        id: 'provider123',
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
      };

      const mockDbUser = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
        name: 'John',
        surname: 'Doe',
        isActive: true,
      };

      const mockProvider: jest.Mocked<AuthProvider> = {
        verifyToken: jest.fn().mockResolvedValue(mockProviderUser),
        getProviderName: jest.fn().mockReturnValue('cognito'),
      };

      jest.spyOn(AuthProviderFactory, 'createProvider').mockReturnValue(mockProvider);
      jest.spyOn(UserService, 'findOrCreateUser').mockResolvedValue({
        user: mockDbUser as never,
        isNewUser: false,
      });

      await optionalAuthMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(req.user).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('returns 401 when auth fails because authMiddleware handles response', async () => {
      const mockToken = 'invalid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;

      const mockProvider: jest.Mocked<AuthProvider> = {
        verifyToken: jest.fn().mockRejectedValue(new Error('Token verification failed')),
        getProviderName: jest.fn().mockReturnValue('cognito'),
      };

      jest.spyOn(AuthProviderFactory, 'createProvider').mockReturnValue(mockProvider);

      await optionalAuthMiddleware(req as AuthenticatedRequest, res as Response, next);

      expect(req.user).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('AuthProviderFactory', () => {
  beforeEach(() => {
    delete process.env['AWS_REGION'];
    delete process.env['COGNITO_USER_POOL_ID'];
    delete process.env['COGNITO_USER_POOL_CLIENT_ID'];
    delete process.env['AUTH0_DOMAIN'];
    delete process.env['AUTH0_AUDIENCE'];
    jest.restoreAllMocks();
  });

  it('creates Cognito provider when env is configured', () => {
    process.env['AWS_REGION'] = 'us-east-1';
    process.env['COGNITO_USER_POOL_ID'] = 'us-east-1_123456789';
    process.env['COGNITO_USER_POOL_CLIENT_ID'] = 'client-id';

    const provider = AuthProviderFactory.createProvider('cognito');

    expect(provider).toBeInstanceOf(CognitoAuthProvider);
    expect(provider.getProviderName()).toBe('cognito');
  });

  it('creates Auth0 provider', () => {
    process.env['AUTH0_DOMAIN'] = 'test.auth0.com';
    process.env['AUTH0_AUDIENCE'] = 'test-audience';

    const provider = AuthProviderFactory.createProvider('auth0');

    expect(provider).toBeInstanceOf(Auth0Provider);
    expect(provider.getProviderName()).toBe('auth0');
  });

  it('throws for unsupported provider', () => {
    expect(() => AuthProviderFactory.createProvider('unsupported')).toThrow(
      'Unsupported auth provider: unsupported'
    );
  });

  it('throws for missing Cognito client id', () => {
    process.env['AWS_REGION'] = 'us-east-1';
    process.env['COGNITO_USER_POOL_ID'] = 'us-east-1_123456789';

    expect(() => AuthProviderFactory.createProvider('cognito')).toThrow(
      'Cognito region, user pool id, and client id are required'
    );
  });
});

describe('CognitoAuthProvider', () => {
  let provider: CognitoAuthProvider;
  let verifyIdTokenSpy: jest.SpyInstance;

  beforeEach(() => {
    provider = new CognitoAuthProvider('us-east-1', 'us-east-1_123456789', 'client-id');
    jest.clearAllMocks();
    verifyIdTokenSpy = jest.spyOn(CognitoJwtVerifier.prototype, 'verifyIdToken').mockResolvedValue({
      sub: 'user-123',
      email: 'test@example.com',
      given_name: 'John',
      family_name: 'Doe',
      email_verified: true,
    });
  });

  afterEach(() => {
    verifyIdTokenSpy.mockRestore();
  });

  it('returns provider name', () => {
    expect(provider.getProviderName()).toBe('cognito');
  });

  it('verifies JWT and maps identity claims', async () => {
    const result = await provider.verifyToken('mock.jwt.token');

    expect(verifyIdTokenSpy).toHaveBeenCalledWith('mock.jwt.token');
    expect(result).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      name: 'John',
      surname: 'Doe',
      emailVerified: true,
    });
  });

  it('throws when verifier rejects token', async () => {
    verifyIdTokenSpy.mockRejectedValueOnce(new Error('Token verification failed'));

    await expect(provider.verifyToken('invalid-token')).rejects.toThrow('Token verification failed');
  });
});

describe('Auth0Provider', () => {
  let provider: Auth0Provider;

  beforeEach(() => {
    provider = new Auth0Provider('test.auth0.com', 'test-audience');
  });

  it('returns provider name', () => {
    expect(provider.getProviderName()).toBe('auth0');
  });

  it('throws for unimplemented verification', async () => {
    await expect(provider.verifyToken('mock.jwt.token')).rejects.toThrow(
      'Auth0 provider not yet implemented'
    );
  });
});
