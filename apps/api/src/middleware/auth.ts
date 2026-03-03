// ================================================================
// src/middleware/auth.ts
// Authentication middleware with provider abstraction
// ================================================================

import { getLogger } from '@my-many-books/shared-logging';
import { i18n } from '@my-many-books/shared-i18n';
import { ERROR_CODES, createErrorResponse } from '@my-many-books/shared-types';
import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../models/interfaces/ModelInterfaces';
import { container } from '../container';
import { TYPES } from '../container/types';
import { UserService as DomainUserService } from '../services/user/UserService';
import { UserEntity } from '../domain/entities/User';

// Extended Request interface to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Auth provider interface
export interface AuthProvider {
  verifyToken(token: string): Promise<AuthProviderUser>;
  getProviderName(): string;
}

export interface AuthProviderUser {
  id: string;
  email: string;
  name: string | undefined;
  surname: string | undefined;
}

// AWS Cognito provider implementation
export class CognitoAuthProvider implements AuthProvider {
  constructor(region: string, userPoolId: string) {
    // Store parameters for potential future use
    void region;
    void userPoolId;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async verifyToken(token: string): Promise<AuthProviderUser> {
    // TODO: Implement proper AWS Cognito JWT verification
    // For now, we will just decode the token for debugging purposes.
    // This is NOT a secure solution for production.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jwt = require('jsonwebtoken') as { decode: (token: string) => unknown };
    const decoded = jwt.decode(token) as {
      sub?: string;
      email?: string;
      given_name?: string;
      family_name?: string;
    } | null;

    if (!decoded || !decoded.sub || !decoded.email) {
      throw new Error('Token verification failed');
    }

    return {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.given_name || undefined,
      surname: decoded.family_name || undefined,
    };
  }

  getProviderName(): string {
    return 'cognito';
  }
}

// Auth0 provider implementation (placeholder)
export class Auth0Provider implements AuthProvider {
  constructor(domain: string, audience: string) {
    // Store parameters for potential future use
    void domain;
    void audience;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async verifyToken(_token: string): Promise<AuthProviderUser> {
    // TODO: Implement Auth0 JWT verification
    throw new Error('Auth0 provider not yet implemented');
  }

  getProviderName(): string {
    return 'auth0';
  }
}

// Provider factory
export class AuthProviderFactory {
  static createProvider(providerType: string): AuthProvider {
    switch (providerType.toLowerCase()) {
      case 'cognito':
        return new CognitoAuthProvider(
          process.env['AWS_REGION'] || 'us-east-1',
          process.env['COGNITO_USER_POOL_ID'] || ''
        );
      case 'auth0':
        return new Auth0Provider(
          process.env['AUTH0_DOMAIN'] || '',
          process.env['AUTH0_AUDIENCE'] || ''
        );
      default:
        throw new Error(`Unsupported auth provider: ${providerType}`);
    }
  }
}

// Re-export for convenience
export { clearUserCache } from './authCache';
import { getCachedUser, setCachedUser } from './authCache';

// Singleton auth provider (avoid re-instantiation per request)
let cachedProvider: AuthProvider | null = null;

function getAuthProvider(): AuthProvider {
  if (!cachedProvider) {
    const providerType = process.env['AUTH_PROVIDER'] || 'cognito';
    cachedProvider = AuthProviderFactory.createProvider(providerType);
  }
  return cachedProvider;
}

export function resetAuthProvider(): void {
  cachedProvider = null;
}

const resolveUserService = (): DomainUserService =>
  container.get<DomainUserService>(TYPES.UserService);

export const UserService = {
  findOrCreateUser(providerUser: AuthProviderUser, provider: string): Promise<{ user: UserEntity; isNewUser: boolean }> {
    return resolveUserService().findOrCreateUser(
      {
        email: providerUser.email,
        name: providerUser.name ?? null,
        surname: providerUser.surname ?? null,
      },
      provider
    );
  },
  getUserById(userId: number): Promise<UserEntity | null> {
    return resolveUserService().getUserById(userId);
  },
  deactivateUser(userId: number): Promise<void> {
    return resolveUserService().deactivateAccount(userId);
  },
};

// Main authentication middleware
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json(createErrorResponse(
        ERROR_CODES.AUTH_HEADER_INVALID,
        i18n.t('errors:auth_header_invalid')
      ));
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const provider = getAuthProvider();

    // Verify token with auth provider
    const providerUser = await provider.verifyToken(token);

    // Find or create user in database (with 60s cache)
    const cachedUser = getCachedUser(providerUser.email);
    let user: UserEntity;
    let isNewUser = false;

    if (cachedUser) {
      user = cachedUser;
    } else {
      const result = await UserService.findOrCreateUser(
        providerUser,
        provider.getProviderName()
      );
      user = result.user;
      isNewUser = result.isNewUser;
      setCachedUser(providerUser.email, user);
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(403).json(createErrorResponse(
        ERROR_CODES.ACCOUNT_DEACTIVATED,
        i18n.t('errors:account_deactivated')
      ));
      return;
    }

    // Create AuthUser object for request context
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      provider: provider.getProviderName(),
      providerUserId: providerUser.id,
      isNewUser,
    };

    // Attach user to request
    req.user = authUser;

    next();
  } catch (error) {
    getLogger().error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'AuthMiddleware: Authentication error:'
    );
    res.status(401).json(createErrorResponse(
      ERROR_CODES.AUTH_FAILED,
      i18n.t('errors:auth_failed'),
      { details: error instanceof Error ? error.message : 'Unknown error' }
    ));
  }
};

// Optional middleware - allows requests without authentication
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth provided, continue without user
      next();
      return;
    }

    // Authentication provided, process it
    await authMiddleware(req, res, next);
  } catch (error) {
    // Auth failed, but continue without user for optional auth
    getLogger().warn(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Optional authentication failed:'
    );
    next();
  }
};
