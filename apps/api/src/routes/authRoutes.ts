// ================================================================
// src/routes/authRoutes.ts
// Authentication routes for login, register, refresh, and logout
// ================================================================

import { Router, Request, Response } from 'express';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  AuthFlowType,
  InitiateAuthCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import { UserService } from '../middleware/auth';

const router = Router();

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

// Login endpoint
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
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
      res.status(401).json({ error: 'Authentication failed' });
      return;
    }

    const authResult = response.AuthenticationResult;

    // Decode ID token to get user info
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jwt = require('jsonwebtoken') as { decode: (token: string) => unknown };
    const decoded = jwt.decode(authResult.IdToken || '') as DecodedIdToken | null;

    if (!decoded || !decoded.sub || !decoded.email) {
      res.status(401).json({ error: 'Invalid token' });
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
      path: '/api/v1/auth',
    });

    // Return access token and user info
    res.json({
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
    console.error('Login error:', error);

    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as { name: string }).name;

      if (errorName === 'NotAuthorizedException') {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      if (errorName === 'UserNotFoundException') {
        res.status(401).json({ error: 'User not found' });
        return;
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Authentication failed', details: errorMessage });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.['refresh_token'] as string | undefined;

    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token' });
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
      res.clearCookie('refresh_token', { path: '/api/v1/auth' });
      res.status(401).json({ error: 'Refresh token invalid' });
      return;
    }

    const authResult = response.AuthenticationResult;

    // Return new access token
    res.json({
      accessToken: authResult.AccessToken,
      idToken: authResult.IdToken,
      expiresIn: authResult.ExpiresIn,
    });
  } catch (error: unknown) {
    console.error('Refresh token error:', error);
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(401).json({ error: 'Refresh failed', details: errorMessage });
  }
});

// Logout endpoint
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('refresh_token', { path: '/api/v1/auth' });
  res.json({ success: true });
});

// Register endpoint
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, surname } = req.body as RegisterRequest;

    if (!email || !password || !name || !surname) {
      res.status(400).json({ error: 'All fields required' });
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

    res.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      requiresVerification: true,
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);

    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as { name: string }).name;

      if (errorName === 'UsernameExistsException') {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      if (errorName === 'InvalidPasswordException') {
        res.status(400).json({ error: 'Password does not meet requirements' });
        return;
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Registration failed', details: errorMessage });
  }
});

export default router;
