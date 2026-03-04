// ================================================================
// src/routes/authRoutes.ts
// Authentication routes for login, register, refresh, logout, and Google OAuth
// ================================================================

import { getLogger } from '@my-many-books/shared-logging';
import { createErrorResponse, ERROR_CODES, type ErrorCode } from '@my-many-books/shared-types';
import express, { Router, Request, Response } from 'express';
import type { AxiosError } from 'axios';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  AuthFlowType,
  InitiateAuthCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import { UserService } from '../middleware/auth';
import {
  buildFrontendAuthRedirect,
  buildGoogleAuthorizeUrl,
  buildPkceCodeChallenge,
  clearGooglePkceVerifierCookie,
  createPkceCodeVerifier,
  createGoogleOAuthState,
  exchangeOAuthCodeForTokens,
  getGooglePkceVerifierFromCookie,
  getWebCallbackUri,
  isAllowedMobileRedirectUri,
  isValidPkceCodeChallenge,
  isValidPkceCodeVerifier,
  isValidGoogleOAuthState,
  setGooglePkceVerifierCookie,
  setRefreshTokenCookie,
  verifyCognitoIdToken,
} from '../services/auth/googleOAuth';
import { completeGoogleLogin } from '../services/auth/googleOAuthSession';

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
  locale?: string;
}

interface GoogleStartQuery {
  platform?: 'web' | 'mobile';
  redirectUri?: string;
  codeChallenge?: string;
}

interface GoogleMobileStartRequest {
  redirectUri: string;
  codeVerifier: string;
}

interface GoogleMobileExchangeRequest {
  code: string;
  state: string;
  redirectUri: string;
  codeVerifier: string;
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
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Email and password required');
      return;
    }

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
    let decoded: Awaited<ReturnType<typeof verifyCognitoIdToken>>;
    try {
      decoded = await verifyCognitoIdToken(authResult.IdToken || '');
    } catch {
      sendError(res, 401, ERROR_CODES.AUTH_TOKEN_INVALID, 'Invalid token');
      return;
    }

    const { user } = await UserService.findOrCreateUser(
      {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.given_name,
        surname: decoded.family_name,
      },
      'cognito'
    );

    setRefreshTokenCookie(res, authResult.RefreshToken, AUTH_COOKIE_PATH);

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

router.get('/google/start', (req: Request, res: Response): void => {
  try {
    const { platform = 'web', redirectUri, codeChallenge } = req.query as GoogleStartQuery;

    if (platform !== 'web' && platform !== 'mobile') {
      sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Invalid platform. Expected web or mobile.');
      return;
    }

    const state = createGoogleOAuthState(platform);
    if (platform === 'mobile') {
      if (!redirectUri) {
        sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'redirectUri is required for mobile Google login');
        return;
      }

      if (!isAllowedMobileRedirectUri(redirectUri)) {
        sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Invalid mobile redirect URI');
        return;
      }

      if (!codeChallenge || !isValidPkceCodeChallenge(codeChallenge)) {
        sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'A valid PKCE codeChallenge is required for mobile login');
        return;
      }

      const authorizeUrl = buildGoogleAuthorizeUrl(redirectUri, state, {
        codeChallenge,
      });

      sendSuccess(res, 200, { authorizeUrl, state });
      return;
    }

    const redirectUriForWeb = getWebCallbackUri(req, AUTH_COOKIE_PATH);
    const codeVerifier = createPkceCodeVerifier();
    const webCodeChallenge = buildPkceCodeChallenge(codeVerifier);
    setGooglePkceVerifierCookie(res, codeVerifier, AUTH_COOKIE_PATH);
    const authorizeUrl = buildGoogleAuthorizeUrl(redirectUriForWeb, state, {
      codeChallenge: webCodeChallenge,
    });

    res.redirect(authorizeUrl);
  } catch (error: unknown) {
    getLogger().error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Google OAuth start error:'
    );
    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Failed to start Google OAuth flow');
  }
});

router.post('/google/mobile/start', (req: Request, res: Response): void => {
  try {
    const { redirectUri, codeVerifier } = req.body as GoogleMobileStartRequest;

    if (!redirectUri || !isAllowedMobileRedirectUri(redirectUri)) {
      sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Invalid mobile redirect URI');
      return;
    }

    if (!codeVerifier || !isValidPkceCodeVerifier(codeVerifier)) {
      sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Invalid PKCE codeVerifier');
      return;
    }

    const state = createGoogleOAuthState('mobile');
    const codeChallenge = buildPkceCodeChallenge(codeVerifier);
    const authorizeUrl = buildGoogleAuthorizeUrl(redirectUri, state, {
      codeChallenge,
    });

    sendSuccess(res, 200, { authorizeUrl, state });
  } catch (error: unknown) {
    getLogger().error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Google OAuth mobile start error:'
    );
    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Failed to start Google OAuth flow');
  }
});

router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  const code = typeof req.query['code'] === 'string' ? req.query['code'] : '';
  const state = typeof req.query['state'] === 'string' ? req.query['state'] : '';
  const codeVerifier = getGooglePkceVerifierFromCookie(req);

  if (!code || !state) {
    clearGooglePkceVerifierCookie(res, AUTH_COOKIE_PATH);
    res.redirect(buildFrontendAuthRedirect('error', 'missing_code_or_state'));
    return;
  }

  if (!isValidGoogleOAuthState(state, 'web')) {
    clearGooglePkceVerifierCookie(res, AUTH_COOKIE_PATH);
    res.redirect(buildFrontendAuthRedirect('error', 'invalid_state'));
    return;
  }

  if (!codeVerifier || !isValidPkceCodeVerifier(codeVerifier)) {
    clearGooglePkceVerifierCookie(res, AUTH_COOKIE_PATH);
    res.redirect(buildFrontendAuthRedirect('error', 'invalid_pkce_verifier'));
    return;
  }

  const redirectUri = getWebCallbackUri(req, AUTH_COOKIE_PATH);

  try {
    const tokenData = await exchangeOAuthCodeForTokens(code, redirectUri, codeVerifier);
    const session = await completeGoogleLogin(tokenData, 'google');
    setRefreshTokenCookie(res, tokenData.refresh_token, AUTH_COOKIE_PATH);
    clearGooglePkceVerifierCookie(res, AUTH_COOKIE_PATH);

    getLogger().info(
      { userId: session.user.id, email: session.user.email },
      'Google OAuth login successful (web)'
    );

    res.redirect(buildFrontendAuthRedirect('success'));
  } catch (error: unknown) {
    const axiosError = error as AxiosError<{ error?: string; error_description?: string }>;
    const reason =
      axiosError.response?.data?.error ||
      (error instanceof Error ? error.message : 'unknown_error');

    getLogger().error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
        reason,
      },
      'Google OAuth callback error:'
    );

    clearGooglePkceVerifierCookie(res, AUTH_COOKIE_PATH);
    res.redirect(buildFrontendAuthRedirect('error', 'oauth_exchange_failed'));
  }
});

router.post('/google/mobile/exchange', async (req: Request, res: Response): Promise<void> => {
  const { code, state, redirectUri, codeVerifier } = req.body as GoogleMobileExchangeRequest;

  if (!code || !state || !redirectUri || !codeVerifier) {
    sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'code, state, redirectUri, and codeVerifier are required');
    return;
  }

  if (!isAllowedMobileRedirectUri(redirectUri)) {
    sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Invalid mobile redirect URI');
    return;
  }

  if (!isValidGoogleOAuthState(state, 'mobile')) {
    sendError(res, 401, ERROR_CODES.AUTH_TOKEN_INVALID, 'Invalid OAuth state');
    return;
  }

  if (!isValidPkceCodeVerifier(codeVerifier)) {
    sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Invalid PKCE codeVerifier');
    return;
  }

  try {
    const tokenData = await exchangeOAuthCodeForTokens(code, redirectUri, codeVerifier);
    const session = await completeGoogleLogin(tokenData, 'google');
    setRefreshTokenCookie(res, tokenData.refresh_token, AUTH_COOKIE_PATH);

    getLogger().info(
      { userId: session.user.id, email: session.user.email },
      'Google OAuth login successful (mobile)'
    );

    sendSuccess(res, 200, session);
  } catch (error: unknown) {
    const axiosError = error as AxiosError<{ error?: string; error_description?: string }>;
    const reason =
      axiosError.response?.data?.error_description ||
      axiosError.response?.data?.error ||
      (error instanceof Error ? error.message : 'unknown_error');

    getLogger().error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
        reason,
      },
      'Google OAuth mobile exchange error:'
    );

    sendError(res, 401, ERROR_CODES.AUTH_FAILED, 'Google authentication failed', { reason });
  }
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.['refresh_token'] as string | undefined;

    if (!refreshToken) {
      sendError(res, 401, ERROR_CODES.AUTH_TOKEN_MISSING, 'No refresh token');
      return;
    }

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

    let decoded: Awaited<ReturnType<typeof verifyCognitoIdToken>>;
    try {
      decoded = await verifyCognitoIdToken(authResult.IdToken || '');
    } catch {
      res.clearCookie('refresh_token', { path: AUTH_COOKIE_PATH });
      sendError(res, 401, ERROR_CODES.AUTH_TOKEN_INVALID, 'Invalid token');
      return;
    }

    const { user } = await UserService.findOrCreateUser(
      {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.given_name,
        surname: decoded.family_name,
      },
      'cognito'
    );

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
      'Refresh token error:'
    );
    res.clearCookie('refresh_token', { path: AUTH_COOKIE_PATH });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendError(res, 401, ERROR_CODES.AUTH_FAILED, 'Refresh failed', { cause: errorMessage });
  }
});

router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('refresh_token', { path: AUTH_COOKIE_PATH });
  sendSuccess(res, 200, null, 'Logout successful');
});

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, surname, locale } = req.body as RegisterRequest;

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
        ...(locale ? [{ Name: 'locale', Value: locale }] : []),
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
