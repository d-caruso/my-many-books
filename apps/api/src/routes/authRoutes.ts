// ================================================================
// src/routes/authRoutes.ts
// Authentication routes for login, register, refresh, and logout
// ================================================================

import { getLogger } from '@my-many-books/shared-logging';
import { createErrorResponse, ERROR_CODES, type ErrorCode } from '@my-many-books/shared-types';
import express, { Router, Request, Response } from 'express';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  AuthFlowType,
  InitiateAuthCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import * as jwt from 'jsonwebtoken';
import { UserService } from '../middleware/auth';

const router: express.Router = Router();

const API_PREFIX = process.env['API_PREFIX'] || '/api';
const API_ROUTE_VERSION = process.env['API_ROUTE_VERSION'] || 'v1';
const AUTH_COOKIE_PATH = `${API_PREFIX}/${API_ROUTE_VERSION}/auth`;

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env['AWS_REGION'] || 'us-east-1',
});

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  surname: string;
}

interface DecodedIdToken {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
}

const sendSuccess = <T>(res: Response, statusCode: number, data: T, message?: string): void => {
  res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
  });
};

const sendError = (
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): void => {
  res.status(statusCode).json(createErrorResponse(code, message, details));
};

// Login endpoint
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Email and password required');
      return;
    }

    // Authenticate with Cognito
    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: process.env['COGNITO_USER_POOL_CLIENT_ID'] || '',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response: InitiateAuthCommandOutput = await cognitoClient.send(command);

    if (!response.AuthenticationResult) {
      sendError(res, 401, ERROR_CODES.AUTH_FAILED, 'Authentication failed');
      return;
    }

    const authResult = response.AuthenticationResult;

    // Decode ID token to get user info
    const decoded = jwt.decode(authResult.IdToken || '') as DecodedIdToken | null;

    if (!decoded || !decoded.sub || !decoded.email) {
      sendError(res, 401, ERROR_CODES.AUTH_TOKEN_INVALID, 'Invalid token');
      return;
    }

    // Find or create user in database
    const { user } = await UserService.findOrCreateUser(
      {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.given_name,
        surname: decoded.family_name,
      },
      'cognito'
    );

    // Set refresh token in HttpOnly cookie
    res.cookie('refresh_token', authResult.RefreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: AUTH_COOKIE_PATH,
    });

    sendSuccess(res, 200, {
      accessToken: authResult.AccessToken,
      idToken: authResult.IdToken,
      expiresIn: authResult.ExpiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error: unknown) {
    getLogger().error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Login error:'
    );

    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as { name: string }).name;

      if (errorName === 'NotAuthorizedException') {
        sendError(res, 401, ERROR_CODES.AUTH_FAILED, 'Invalid email or password');
        return;
      }

      if (errorName === 'UserNotFoundException') {
        sendError(res, 401, ERROR_CODES.USER_NOT_FOUND, 'User not found');
        return;
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendError(res, 500, ERROR_CODES.AUTH_FAILED, 'Authentication failed', { cause: errorMessage });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.['refresh_token'] as string | undefined;

    if (!refreshToken) {
      sendError(res, 401, ERROR_CODES.AUTH_TOKEN_MISSING, 'No refresh token');
      return;
    }

    // Exchange refresh token for new access token
    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      ClientId: process.env['COGNITO_USER_POOL_CLIENT_ID'] || '',
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const response: InitiateAuthCommandOutput = await cognitoClient.send(command);

    if (!response.AuthenticationResult) {
      res.clearCookie('refresh_token', { path: AUTH_COOKIE_PATH });
      sendError(res, 401, ERROR_CODES.AUTH_TOKEN_INVALID, 'Refresh token invalid');
      return;
    }

    const authResult = response.AuthenticationResult;

    sendSuccess(res, 200, {
      accessToken: authResult.AccessToken,
      idToken: authResult.IdToken,
      expiresIn: authResult.ExpiresIn,
    });
  } catch (error: unknown) {
    getLogger().error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Refresh token error:'
    );
    res.clearCookie('refresh_token', { path: AUTH_COOKIE_PATH });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendError(res, 401, ERROR_CODES.AUTH_FAILED, 'Refresh failed', { cause: errorMessage });
  }
});

// Logout endpoint
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('refresh_token', { path: AUTH_COOKIE_PATH });
  sendSuccess(res, 200, null, 'Logout successful');
});

// Register endpoint
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, surname } = req.body as RegisterRequest;

    if (!email || !password || !name || !surname) {
      sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'All fields required');
      return;
    }

    const command = new SignUpCommand({
      ClientId: process.env['COGNITO_USER_POOL_CLIENT_ID'] || '',
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'given_name', Value: name },
        { Name: 'family_name', Value: surname },
      ],
    });

    await cognitoClient.send(command);

    sendSuccess(
      res,
      200,
      { requiresVerification: true },
      'Registration successful. Please check your email to verify your account.'
    );
  } catch (error: unknown) {
    getLogger().error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Registration error:'
    );

    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as { name: string }).name;

      if (errorName === 'UsernameExistsException') {
        sendError(res, 409, ERROR_CODES.CONFLICT, 'Email already registered');
        return;
      }

      if (errorName === 'InvalidPasswordException') {
        sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, 'Password does not meet requirements');
        return;
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Registration failed', { cause: errorMessage });
  }
});

export default router;
