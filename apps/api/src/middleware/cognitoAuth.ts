// ================================================================
// src/middleware/cognitoAuth.ts
// ================================================================

import Joi from 'joi';
import { getLogger } from '@my-many-books/shared-logging';
import { i18n } from '@my-many-books/shared-i18n';
import { ERROR_CODES, createErrorResponse, type ErrorCode } from '@my-many-books/shared-types';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { verify, JwtPayload, Algorithm } from 'jsonwebtoken';

interface CognitoJwtPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  given_name?: string;
  family_name?: string;
  'cognito:groups': string[];
  token_use: string;
  aud: string | string[];
  iss: string;
  exp: number;
  iat: number;
  scope?: string;
  scopes?: string[];
}

export interface CognitoConfig {
  enabled: boolean;
  userPoolId: string;
  clientId: string;
  region: string;
  issuer: string;
  algorithms: Algorithm[];
  requiredScopes?: string[];
}

export interface CognitoUser {
  sub: string; // User ID
  email: string;
  email_verified: boolean;
  given_name: string | undefined;
  family_name: string | undefined;
  groups?: string[];
  scopes?: string[];
  token_use: string;
  aud: string; // Client ID
  iss: string; // Issuer
  exp: number; // Expiration
  iat: number; // Issued at
}

interface JwtHeader {
  kid?: string;
  alg?: string;
  typ?: string;
}

const isJwtHeader = (value: unknown): value is JwtHeader => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    (candidate['kid'] === undefined || typeof candidate['kid'] === 'string') &&
    (candidate['alg'] === undefined || typeof candidate['alg'] === 'string') &&
    (candidate['typ'] === undefined || typeof candidate['typ'] === 'string')
  );
};

interface AuthContext {
  user: CognitoUser | undefined;
  isAuthenticated: boolean;
}

interface EventWithAuthContext extends APIGatewayProxyEvent {
  authContext?: AuthContext;
}

export interface CognitoAuthResult {
  isAuthenticated: boolean;
  user?: CognitoUser;
  error?: string;
  errorCode?: ErrorCode;
  statusCode?: number;
}

export class CognitoAuthenticator {
  private config: CognitoConfig;
  private publicKeys: Map<string, string> = new Map();

  private readonly cognitoPayloadSchema: Joi.ObjectSchema<CognitoJwtPayload> = Joi.object<CognitoJwtPayload>({
    sub: Joi.string().required(),
    email: Joi.string().default(''),
    email_verified: Joi.boolean().default(false),
    given_name: Joi.string().optional(),
    family_name: Joi.string().optional(),
    'cognito:groups': Joi.array().items(Joi.string()).default([]),
    token_use: Joi.string().default(''),
    aud: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).required(),
    iss: Joi.string().required(),
    exp: Joi.number().required(),
    iat: Joi.number().required(),
    scope: Joi.string().optional(),
    scopes: Joi.array().items(Joi.string()).optional(),
  }).unknown(true);

  constructor(config: CognitoConfig) {
    this.config = config;
    this.initializeJwksClient();
  }

  private initializeJwksClient(): void {
    // In production, you'd use a JWKS client library
    // For now, we'll simulate the key retrieval
  }

  public authenticate(event: APIGatewayProxyEvent): CognitoAuthResult {
    if (!this.config.enabled) {
      return { isAuthenticated: true };
    }

    const token = this.extractToken(event);
    if (!token) {
      return {
        isAuthenticated: false,
        error: 'Authorization token is required',
        errorCode: ERROR_CODES.AUTH_TOKEN_MISSING,
        statusCode: 401,
      };
    }

    try {
      const decoded = this.verifyToken(token);

      // Validate token structure
      if (!this.isValidCognitoToken(decoded)) {
        return {
          isAuthenticated: false,
          error: 'Invalid token format',
          errorCode: ERROR_CODES.INVALID_TOKEN_FORMAT,
          statusCode: 401,
        };
      }

      const user = this.extractUserFromToken(decoded);

      // Check required scopes if specified
      if (this.config.requiredScopes && this.config.requiredScopes.length > 0) {
        const hasRequiredScopes = this.validateScopes(
          user.scopes || [],
          this.config.requiredScopes
        );
        if (!hasRequiredScopes) {
          return {
            isAuthenticated: false,
            error: 'Insufficient permissions',
            errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            statusCode: 403,
          };
        }
      }

      return {
        isAuthenticated: true,
        user,
      };
    } catch (error) {
      getLogger().error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Token verification failed:'
      );

      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          return {
            isAuthenticated: false,
            error: 'Token has expired',
            errorCode: ERROR_CODES.AUTH_TOKEN_EXPIRED,
            statusCode: 401,
          };
        }

        if (error.message.includes('signature')) {
          return {
            isAuthenticated: false,
            error: 'Invalid token signature',
            errorCode: ERROR_CODES.INVALID_TOKEN_SIGNATURE,
            statusCode: 401,
          };
        }
      }

      return {
        isAuthenticated: false,
        error: 'Token verification failed',
        errorCode: ERROR_CODES.AUTH_FAILED,
        statusCode: 401,
      };
    }
  }

  private extractToken(event: APIGatewayProxyEvent): string | null {
    const authHeader = event.headers['Authorization'] || event.headers['authorization'];

    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer') {
      return null;
    }

    return parts[1] || null;
  }

  private verifyToken(token: string): JwtPayload {
    // Extract the key ID from token header
    const decoded = this.decodeTokenHeader(token);
    const keyId = decoded.kid;

    if (!keyId) {
      throw new Error('Token does not have a key ID');
    }

    // Get the public key for verification
    const publicKey = this.getPublicKey(keyId);

    // Verify the token
    const payload = verify(token, publicKey, {
      issuer: this.config.issuer,
      audience: this.config.clientId,
      algorithms: this.config.algorithms,
    }) as JwtPayload;

    return payload;
  }

  private decodeTokenHeader(token: string): JwtHeader {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const header = Buffer.from(parts[0]!, 'base64url').toString('utf8');
    const parsedHeader: unknown = JSON.parse(header);
    if (!isJwtHeader(parsedHeader)) {
      throw new Error('Invalid token header format');
    }

    return parsedHeader;
  }

  private getPublicKey(keyId: string): string {
    // Check cache first
    if (this.publicKeys.has(keyId)) {
      return this.publicKeys.get(keyId)!;
    }

    // In production, fetch from Cognito JWKS endpoint
    // https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json
    void `https://cognito-idp.${this.config.region}.amazonaws.com/${this.config.userPoolId}/.well-known/jwks.json`;

    try {
      // Simulate fetching public key
      // In real implementation, you'd use a JWKS client
      const mockPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`;

      // Cache the key
      this.publicKeys.set(keyId, mockPublicKey);
      return mockPublicKey;
    } catch {
      throw new Error(`Failed to fetch public key for kid: ${keyId}`);
    }
  }

  private isValidCognitoToken(payload: JwtPayload): boolean {
    return !!(
      payload.sub &&
      payload.aud &&
      payload.iss &&
      payload['token_use'] &&
      payload.exp &&
      payload.iat
    );
  }

  private extractUserFromToken(payload: JwtPayload): CognitoUser {
    const result = this.cognitoPayloadSchema.validate(payload);
    if (result.error) {
      throw new Error(`Invalid Cognito token payload: ${result.error.message}`);
    }

    const { value } = result;
    const aud = Array.isArray(value.aud) ? (value.aud[0] ?? '') : value.aud;

    return {
      sub: value.sub,
      email: value.email,
      email_verified: value.email_verified,
      given_name: value.given_name,
      family_name: value.family_name,
      groups: value['cognito:groups'],
      scopes: this.extractScopes(payload),
      token_use: value.token_use,
      aud,
      iss: value.iss,
      exp: value.exp,
      iat: value.iat,
    };
  }

  private extractScopes(payload: JwtPayload): string[] {
    // Scopes can be in 'scope' (space-separated) or 'scopes' (array)
    const scope = payload['scope'] as unknown;
    if (typeof scope === 'string') {
      return scope.split(' ');
    }

    const scopes = payload['scopes'] as unknown;
    if (Array.isArray(scopes)) {
      return scopes.filter((s): s is string => typeof s === 'string');
    }

    return [];
  }

  private validateScopes(userScopes: string[], requiredScopes: string[]): boolean {
    return requiredScopes.every(required => userScopes.includes(required));
  }

  public extractUserContext(event: APIGatewayProxyEvent): CognitoUser | null {
    const eventWithContext = event as EventWithAuthContext;
    return eventWithContext.authContext?.user || null;
  }

  public hasPermission(user: CognitoUser, permission: string): boolean {
    return user['scopes']?.includes(permission) || false;
  }

  public isInGroup(user: CognitoUser, group: string): boolean {
    return user.groups?.includes(group) || false;
  }
}

// Permission constants
export const PERMISSIONS = {
  BOOKS_READ: 'books:read',
  BOOKS_WRITE: 'books:write',
  BOOKS_DELETE: 'books:delete',
  AUTHORS_READ: 'authors:read',
  AUTHORS_WRITE: 'authors:write',
  AUTHORS_DELETE: 'authors:delete',
  CATEGORIES_READ: 'categories:read',
  CATEGORIES_WRITE: 'categories:write',
  CATEGORIES_DELETE: 'categories:delete',
  ISBN_LOOKUP: 'isbn:lookup',
  ADMIN_ACCESS: 'admin:access',
} as const;

// User groups
export const USER_GROUPS = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  READER: 'reader',
} as const;

// Middleware wrapper
export const withCognitoAuth = (
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>,
  authenticator: CognitoAuthenticator,
  requiredPermissions?: string[]
) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const authResult = authenticator.authenticate(event);

    if (!authResult.isAuthenticated) {
      const errorCode = authResult.errorCode ?? ERROR_CODES.AUTH_FAILED;
      return {
        statusCode: authResult.statusCode || 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(createErrorResponse(
          errorCode,
          i18n.isInitialized ? i18n.t('errors:auth_failed') : (authResult.error ?? 'Authentication failed')
        )),
      };
    }

    // Check specific permissions if required
    if (requiredPermissions && authResult.user) {
      const hasAllPermissions = requiredPermissions.every(permission =>
        authenticator.hasPermission(authResult.user!, permission)
      );

      if (!hasAllPermissions) {
        return {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(createErrorResponse(
            ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            i18n.isInitialized ? i18n.t('errors:insufficient_permissions') : 'Insufficient permissions',
            { requiredPermissions }
          )),
        };
      }
    }

    // Add auth context to event
    const eventWithContext = event as EventWithAuthContext;
    eventWithContext.authContext = {
      user: authResult.user,
      isAuthenticated: true,
    };

    return handler(event);
  };
};

// Utility function to create authenticator from environment
export const createCognitoAuthenticator = (): CognitoAuthenticator => {
  const config: CognitoConfig = {
    enabled: process.env['COGNITO_ENABLED'] === 'true',
    userPoolId: process.env['COGNITO_USER_POOL_ID'] || '',
    clientId: process.env['COGNITO_CLIENT_ID'] || '',
    region: process.env['AWS_REGION'] || 'us-east-1',
    issuer: `https://cognito-idp.${process.env['AWS_REGION'] || 'us-east-1'}.amazonaws.com/${process.env['COGNITO_USER_POOL_ID'] || ''}`,
    algorithms: ['RS256' as Algorithm],
  };

  return new CognitoAuthenticator(config);
};
