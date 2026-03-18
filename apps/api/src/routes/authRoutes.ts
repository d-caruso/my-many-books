// ================================================================
// src/routes/authRoutes.ts
// Authentication routes for login, register, refresh, logout, and Google OAuth
// ================================================================

import { getLogger } from '@my-many-books/shared-logging';
import {
  createErrorResponse,
  ERROR_CODES,
  PASSWORD_RESET_POLICY,
  type ErrorCode,
} from '@my-many-books/shared-types';
import express, { Router, Request, Response } from 'express';
import type { AxiosError } from 'axios';
import {
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
  AuthFlowType,
  InitiateAuthCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import { UserService } from '../middleware/auth';
import { User } from '../models/User';
import {
  buildCognitoLogoutUrl,
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
import { authLifecycleHookService } from '../services/auth/AuthLifecycleHookService';
import { COGNITO_PASSWORD_ERRORS, cognitoPasswordService } from '../services/auth/cognitoPasswordService';
import { AUTH_COOKIE_PATH } from '../constants/api';
import { COGNITO_ERRORS } from '../constants/cognito';
import { authLimiter, oauthCallbackLimiter, refreshLimiter } from '../middleware/rateLimiters';

const router: express.Router = Router();

const cognitoRegion = (process.env['COGNITO_USER_POOL_ID'] ?? '').split('_')[0] || 'us-east-1';
const cognitoClient = new CognitoIdentityProviderClient({
  region: cognitoRegion,
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

interface VerifyEmailRequest {
  email: string;
  code: string;
}

interface ResendCodeRequest {
  email: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ConfirmForgotPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
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

const toAuthErrorPayload = (error: unknown): Record<string, unknown> => ({
  error,
  errorName: error && typeof error === 'object' && 'name' in error ? (error as { name?: string }).name ?? null : null,
  errorMessage: error instanceof Error ? error.message : String(error),
});

const toEventUser = (user: {
  id: number;
  email: string;
  role: string;
  isActive: boolean;
  name?: string | null;
  surname?: string | null;
}): Record<string, unknown> => ({
  id: user.id,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  name: user.name ?? null,
  surname: user.surname ?? null,
});
router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as LoginRequest;

  if (!email || !password) {
    sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Email and password required');
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const loginPayload = {
    email: normalizedEmail,
    provider: 'cognito',
    method: 'password',
  };

  await authLifecycleHookService.emitUserLoginBefore(loginPayload);

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: process.env['COGNITO_USER_POOL_CLIENT_ID'] || '',
      AuthParameters: {
        USERNAME: normalizedEmail,
        PASSWORD: password,
      },
    });

    const response: InitiateAuthCommandOutput = await cognitoClient.send(command);

    if (!response.AuthenticationResult) {
      await authLifecycleHookService.emitAuthLoginFailure({
        ...loginPayload,
        reason: 'missing_authentication_result',
      });
      sendError(res, 401, ERROR_CODES.AUTH_FAILED, 'Authentication failed');
      return;
    }

    const authResult = response.AuthenticationResult;
    let decoded: Awaited<ReturnType<typeof verifyCognitoIdToken>>;
    try {
      decoded = await verifyCognitoIdToken(authResult.IdToken || '');
    } catch (error) {
      await authLifecycleHookService.emitAuthLoginFailure({
        ...loginPayload,
        reason: 'invalid_id_token',
        ...toAuthErrorPayload(error),
      });
      sendError(res, 401, ERROR_CODES.AUTH_TOKEN_INVALID, 'Invalid token');
      return;
    }

    const { user, isNewUser } = await UserService.findOrCreateUser(
      {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.given_name,
        surname: decoded.family_name,
      },
      'cognito'
    );

    await authLifecycleHookService.emitUserLoginAfter({
      ...loginPayload,
      user: toEventUser(user),
      isNewUser,
    });

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

      if (errorName === COGNITO_ERRORS.USER_NOT_CONFIRMED || errorName === COGNITO_ERRORS.NOT_AUTHORIZED) {
        try {
          const getUserCommand = new AdminGetUserCommand({
            UserPoolId: process.env['COGNITO_USER_POOL_ID'] || '',
            Username: (req.body as LoginRequest).email,
          });
          const userResult = await cognitoClient.send(getUserCommand);
          if (userResult.UserStatus === 'UNCONFIRMED') {
            await authLifecycleHookService.emitAuthLoginFailure({
              ...loginPayload,
              reason: 'email_not_verified',
              ...toAuthErrorPayload(error),
            });
            sendError(res, 401, ERROR_CODES.EMAIL_NOT_VERIFIED, 'Email not verified');
            return;
          }
        } catch {
          // user lookup failed, fall through to generic error
        }
        await authLifecycleHookService.emitAuthLoginFailure({
          ...loginPayload,
          reason: 'invalid_credentials',
          ...toAuthErrorPayload(error),
        });
        sendError(res, 401, ERROR_CODES.AUTH_FAILED, 'Invalid email or password');
        return;
      }

      if (errorName === COGNITO_ERRORS.USER_NOT_FOUND) {
        await authLifecycleHookService.emitAuthLoginFailure({
          ...loginPayload,
          reason: 'user_not_found',
          ...toAuthErrorPayload(error),
        });
        sendError(res, 401, ERROR_CODES.USER_NOT_FOUND, 'User not found');
        return;
      }
    }

    await authLifecycleHookService.emitAuthLoginFailure({
      ...loginPayload,
      reason: 'auth_failed',
      ...toAuthErrorPayload(error),
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendError(res, 500, ERROR_CODES.AUTH_FAILED, 'Authentication failed', { cause: errorMessage });
  }
});

router.get('/google/start', authLimiter, (req: Request, res: Response): void => {
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

router.post('/google/mobile/start', authLimiter, (req: Request, res: Response): void => {
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

router.get('/google/callback', oauthCallbackLimiter, async (req: Request, res: Response): Promise<void> => {
  const loginPayload = {
    provider: 'google',
    method: 'oauth',
    platform: 'web',
  };
  const cognitoError = typeof req.query['error'] === 'string' ? req.query['error'] : '';
  if (cognitoError) {
    await authLifecycleHookService.emitAuthLoginFailure({
      ...loginPayload,
      reason: cognitoError,
    });
    clearGooglePkceVerifierCookie(res, AUTH_COOKIE_PATH);
    res.redirect(buildFrontendAuthRedirect('error', 'oauth_exchange_failed'));
    return;
  }

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
    await authLifecycleHookService.emitUserLoginBefore(loginPayload);
    const tokenData = await exchangeOAuthCodeForTokens(code, redirectUri, codeVerifier);
    const session = await completeGoogleLogin(tokenData, 'google');
    await authLifecycleHookService.emitUserLoginAfter({
      ...loginPayload,
      user: session.user,
    });
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

    await authLifecycleHookService.emitAuthLoginFailure({
      ...loginPayload,
      reason,
      ...toAuthErrorPayload(error),
    });

    clearGooglePkceVerifierCookie(res, AUTH_COOKIE_PATH);
    res.redirect(buildFrontendAuthRedirect('error', 'oauth_exchange_failed'));
  }
});

router.post('/google/mobile/exchange', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const loginPayload = {
    provider: 'google',
    method: 'oauth',
    platform: 'mobile',
  };
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
    await authLifecycleHookService.emitUserLoginBefore(loginPayload);
    const tokenData = await exchangeOAuthCodeForTokens(code, redirectUri, codeVerifier);
    const session = await completeGoogleLogin(tokenData, 'google');
    await authLifecycleHookService.emitUserLoginAfter({
      ...loginPayload,
      user: session.user,
    });
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

    await authLifecycleHookService.emitAuthLoginFailure({
      ...loginPayload,
      reason,
      ...toAuthErrorPayload(error),
    });

    sendError(res, 401, ERROR_CODES.AUTH_FAILED, 'Google authentication failed', { reason });
  }
});

router.post('/refresh', refreshLimiter, async (req: Request, res: Response): Promise<void> => {
  const refreshPayload = {
    provider: 'cognito',
    method: 'refresh_token',
  };
  try {
    const refreshToken = req.cookies?.['refresh_token'] as string | undefined;

    if (!refreshToken) {
      await authLifecycleHookService.emitRefresh('FAILURE', {
        ...refreshPayload,
        reason: 'missing_refresh_token',
      });
      sendError(res, 401, ERROR_CODES.AUTH_TOKEN_MISSING, 'No refresh token');
      return;
    }

    await authLifecycleHookService.emitRefresh('BEFORE', refreshPayload);

    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      ClientId: process.env['COGNITO_USER_POOL_CLIENT_ID'] || '',
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const response: InitiateAuthCommandOutput = await cognitoClient.send(command);

    if (!response.AuthenticationResult) {
      await authLifecycleHookService.emitRefresh('FAILURE', {
        ...refreshPayload,
        reason: 'invalid_refresh_token',
      });
      res.clearCookie('refresh_token', { path: AUTH_COOKIE_PATH });
      sendError(res, 401, ERROR_CODES.AUTH_TOKEN_INVALID, 'Refresh token invalid');
      return;
    }

    const authResult = response.AuthenticationResult;

    let decoded: Awaited<ReturnType<typeof verifyCognitoIdToken>>;
    try {
      decoded = await verifyCognitoIdToken(authResult.IdToken || '');
    } catch (error) {
      await authLifecycleHookService.emitRefresh('FAILURE', {
        ...refreshPayload,
        reason: 'invalid_id_token',
        ...toAuthErrorPayload(error),
      });
      res.clearCookie('refresh_token', { path: AUTH_COOKIE_PATH });
      sendError(res, 401, ERROR_CODES.AUTH_TOKEN_INVALID, 'Invalid token');
      return;
    }

    const { user, isNewUser } = await UserService.findOrCreateUser(
      {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.given_name,
        surname: decoded.family_name,
      },
      'cognito'
    );

    await authLifecycleHookService.emitRefresh('AFTER', {
      ...refreshPayload,
      user: toEventUser(user),
      isNewUser,
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
      'Refresh token error:'
    );
    await authLifecycleHookService.emitRefresh('FAILURE', {
      ...refreshPayload,
      reason: 'refresh_failed',
      ...toAuthErrorPayload(error),
    });
    res.clearCookie('refresh_token', { path: AUTH_COOKIE_PATH });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendError(res, 401, ERROR_CODES.AUTH_FAILED, 'Refresh failed', { cause: errorMessage });
  }
});

router.post('/logout', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const logoutPayload = {
    hadRefreshToken: Boolean(req.cookies?.['refresh_token']),
  };

  await authLifecycleHookService.emitUserLogout('BEFORE', logoutPayload);

  try {
    res.clearCookie('refresh_token', { path: AUTH_COOKIE_PATH });
    let cognitoLogoutUrl: string | null = null;
    try {
      const frontendUrl = (process.env['FRONTEND_URL'] || 'http://localhost:3000').replace(/\/+$/, '');
      cognitoLogoutUrl = buildCognitoLogoutUrl(`${frontendUrl}/auth`);
    } catch {
      // Cognito not configured, skip
    }

    await authLifecycleHookService.emitUserLogout('AFTER', {
      ...logoutPayload,
      cognitoLogoutUrl,
    });

    sendSuccess(res, 200, { cognitoLogoutUrl }, 'Logout successful');
  } catch (error: unknown) {
    await authLifecycleHookService.emitUserLogout('FAILURE', {
      ...logoutPayload,
      ...toAuthErrorPayload(error),
    });
    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Logout failed');
  }
});

router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, password, name, surname, locale } = req.body as RegisterRequest;

  if (!email || !password || !name || !surname) {
    sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'All fields required');
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const registerPayload = {
    email: normalizedEmail,
    provider: 'cognito',
    locale: locale ?? null,
  };

  await authLifecycleHookService.emitUserRegister('BEFORE', registerPayload);

  try {
    const command = new SignUpCommand({
      ClientId: process.env['COGNITO_USER_POOL_CLIENT_ID'] || '',
      Username: normalizedEmail,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: normalizedEmail },
        { Name: 'given_name', Value: name },
        { Name: 'family_name', Value: surname },
        ...(locale ? [{ Name: 'locale', Value: locale }] : []),
      ],
    });

    await cognitoClient.send(command);

    await authLifecycleHookService.emitUserRegister('AFTER', {
      ...registerPayload,
      requiresVerification: true,
    });

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

      if (errorName === COGNITO_ERRORS.USERNAME_EXISTS) {
        try {
          const getUserCommand = new AdminGetUserCommand({
            UserPoolId: process.env['COGNITO_USER_POOL_ID'] || '',
            Username: normalizedEmail,
          });
          const userResult = await cognitoClient.send(getUserCommand);
          const isConfirmed = userResult.UserStatus === 'CONFIRMED';

          if (isConfirmed) {
            const existsInDb = await User.findOne({ where: { email: normalizedEmail }, attributes: ['id'] });
            const code = existsInDb ? ERROR_CODES.CONFLICT : ERROR_CODES.EMAIL_REGISTERED_VIA_SOCIAL;
            await authLifecycleHookService.emitUserRegister('FAILURE', {
              ...registerPayload,
              reason: 'email_already_registered',
              ...toAuthErrorPayload(error),
            });
            sendError(res, 409, code, 'Email already registered');
          } else {
            await authLifecycleHookService.emitUserRegister('FAILURE', {
              ...registerPayload,
              reason: 'email_not_verified',
              ...toAuthErrorPayload(error),
            });
            sendError(res, 409, ERROR_CODES.EMAIL_NOT_VERIFIED, 'Email registered but not verified');
          }
        } catch {
          await authLifecycleHookService.emitUserRegister('FAILURE', {
            ...registerPayload,
            reason: 'email_already_registered',
            ...toAuthErrorPayload(error),
          });
          sendError(res, 409, ERROR_CODES.CONFLICT, 'Email already registered');
        }
        return;
      }

      if (errorName === COGNITO_ERRORS.INVALID_PASSWORD) {
        await authLifecycleHookService.emitUserRegister('FAILURE', {
          ...registerPayload,
          reason: 'invalid_password',
          ...toAuthErrorPayload(error),
        });
        sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, 'Password does not meet requirements');
        return;
      }
    }

    await authLifecycleHookService.emitUserRegister('FAILURE', {
      ...registerPayload,
      reason: 'registration_failed',
      ...toAuthErrorPayload(error),
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Registration failed', { cause: errorMessage });
  }
});

router.post('/verify-email', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, code } = req.body as VerifyEmailRequest;

  if (!email || !code) {
    sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Email and verification code are required');
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const verifyPayload = {
    email: normalizedEmail,
  };

  await authLifecycleHookService.emitVerifyEmail('BEFORE', verifyPayload);

  try {
    const command = new ConfirmSignUpCommand({
      ClientId: process.env['COGNITO_USER_POOL_CLIENT_ID'] || '',
      Username: normalizedEmail,
      ConfirmationCode: code,
    });

    await cognitoClient.send(command);

    await authLifecycleHookService.emitVerifyEmail('AFTER', {
      ...verifyPayload,
      verified: true,
    });

    sendSuccess(res, 200, { verified: true }, 'Email verified successfully');
  } catch (error: unknown) {
    getLogger().error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Email verification error:'
    );

    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as { name: string }).name;

      if (errorName === COGNITO_ERRORS.CODE_MISMATCH) {
        await authLifecycleHookService.emitVerifyEmail('FAILURE', {
          ...verifyPayload,
          reason: 'code_mismatch',
          ...toAuthErrorPayload(error),
        });
        sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, 'Invalid verification code');
        return;
      }

      if (errorName === COGNITO_ERRORS.EXPIRED_CODE) {
        await authLifecycleHookService.emitVerifyEmail('FAILURE', {
          ...verifyPayload,
          reason: 'expired_code',
          ...toAuthErrorPayload(error),
        });
        sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, 'Verification code has expired');
        return;
      }

      if (errorName === COGNITO_ERRORS.NOT_AUTHORIZED) {
        await authLifecycleHookService.emitVerifyEmail('FAILURE', {
          ...verifyPayload,
          reason: 'already_verified',
          ...toAuthErrorPayload(error),
        });
        sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, 'Account already verified');
        return;
      }

      if (errorName === COGNITO_ERRORS.USER_NOT_FOUND) {
        await authLifecycleHookService.emitVerifyEmail('FAILURE', {
          ...verifyPayload,
          reason: 'user_not_found',
          ...toAuthErrorPayload(error),
        });
        sendError(res, 404, ERROR_CODES.USER_NOT_FOUND, 'User not found');
        return;
      }
    }

    await authLifecycleHookService.emitVerifyEmail('FAILURE', {
      ...verifyPayload,
      reason: 'verify_email_failed',
      ...toAuthErrorPayload(error),
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Email verification failed', { cause: errorMessage });
  }
});

router.post('/resend-code', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as ResendCodeRequest;

  if (!email) {
    sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Email is required');
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const resendPayload = {
    email: normalizedEmail,
  };

  await authLifecycleHookService.emitResendCode('BEFORE', resendPayload);

  try {
    const command = new ResendConfirmationCodeCommand({
      ClientId: process.env['COGNITO_USER_POOL_CLIENT_ID'] || '',
      Username: normalizedEmail,
    });

    await cognitoClient.send(command);

    await authLifecycleHookService.emitResendCode('AFTER', {
      ...resendPayload,
      sent: true,
    });

    sendSuccess(res, 200, { sent: true }, 'Verification code resent');
  } catch (error: unknown) {
    getLogger().error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Resend verification code error:'
    );

    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as { name: string }).name;

      if (errorName === COGNITO_ERRORS.USER_NOT_FOUND) {
        await authLifecycleHookService.emitResendCode('FAILURE', {
          ...resendPayload,
          reason: 'user_not_found',
          ...toAuthErrorPayload(error),
        });
        sendError(res, 404, ERROR_CODES.USER_NOT_FOUND, 'User not found');
        return;
      }

      if (errorName === COGNITO_ERRORS.LIMIT_EXCEEDED) {
        await authLifecycleHookService.emitResendCode('FAILURE', {
          ...resendPayload,
          reason: 'rate_limited',
          ...toAuthErrorPayload(error),
        });
        sendError(res, 429, ERROR_CODES.RATE_LIMIT_EXCEEDED, 'Too many requests. Please try again later.');
        return;
      }

      if (errorName === COGNITO_ERRORS.CODE_DELIVERY_FAILURE) {
        await authLifecycleHookService.emitResendCode('FAILURE', {
          ...resendPayload,
          reason: 'code_delivery_failure',
          ...toAuthErrorPayload(error),
        });
        sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Failed to deliver verification code');
        return;
      }
    }

    await authLifecycleHookService.emitResendCode('FAILURE', {
      ...resendPayload,
      reason: 'resend_code_failed',
      ...toAuthErrorPayload(error),
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Failed to resend verification code', { cause: errorMessage });
  }
});

router.post('/forgot-password', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as ForgotPasswordRequest;
  if (!email || typeof email !== 'string') {
    sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Email is required');
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const forgotPasswordPayload = {
    email: normalizedEmail,
  };

  await authLifecycleHookService.emitForgotPassword('BEFORE', forgotPasswordPayload);

  try {
    await cognitoPasswordService.requestForgotPassword({ email: normalizedEmail });

    await authLifecycleHookService.emitForgotPassword('AFTER', {
      ...forgotPasswordPayload,
      accepted: true,
      expiresInMinutes: PASSWORD_RESET_POLICY.TOKEN_TTL_MINUTES,
    });

    sendSuccess(
      res,
      200,
      {
        accepted: true,
        expiresInMinutes: PASSWORD_RESET_POLICY.TOKEN_TTL_MINUTES,
      },
      'If the account exists, password reset instructions have been sent.'
    );
  } catch (error: unknown) {
    getLogger().error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Forgot password error:'
    );

    const errorName = (error as { name?: string })?.name;
    if (errorName === COGNITO_ERRORS.LIMIT_EXCEEDED || errorName === COGNITO_ERRORS.TOO_MANY_REQUESTS) {
      await authLifecycleHookService.emitForgotPassword('FAILURE', {
        ...forgotPasswordPayload,
        reason: 'rate_limited',
        ...toAuthErrorPayload(error),
      });
      sendError(
        res,
        429,
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many requests. Please try again later.'
      );
      return;
    }

    if (errorName === COGNITO_PASSWORD_ERRORS.COGNITO_CONFIG_ERROR_NAME) {
      await authLifecycleHookService.emitForgotPassword('FAILURE', {
        ...forgotPasswordPayload,
        reason: 'cognito_configuration_error',
        ...toAuthErrorPayload(error),
      });
      sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Password reset is currently unavailable');
      return;
    }

    await authLifecycleHookService.emitForgotPassword('FAILURE', {
      ...forgotPasswordPayload,
      reason: 'forgot_password_failed',
      ...toAuthErrorPayload(error),
    });

    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Failed to process password reset request');
  }
});

router.post('/confirm-forgot-password', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email, code, newPassword, locale } = req.body as ConfirmForgotPasswordRequest;
  if (!email || !code || !newPassword) {
    sendError(
      res,
      400,
      ERROR_CODES.INVALID_REQUEST_BODY,
      'Email, code, and newPassword are required'
    );
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const resetPasswordPayload = {
    email: normalizedEmail,
    locale: locale ?? null,
  };

  await authLifecycleHookService.emitResetPassword('BEFORE', resetPasswordPayload);

  try {
    await cognitoPasswordService.confirmForgotPassword({
      email: normalizedEmail,
      code,
      newPassword,
      locale,
    });

    await authLifecycleHookService.emitResetPassword('AFTER', {
      ...resetPasswordPayload,
      reset: true,
      signInRequired: true,
    });

    sendSuccess(
      res,
      200,
      {
        reset: true,
        signInRequired: true,
      },
      'Password has been reset successfully'
    );
  } catch (error: unknown) {
    getLogger().error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Confirm forgot password error:'
    );

    const errorName = (error as { name?: string })?.name;
    if (errorName === COGNITO_PASSWORD_ERRORS.INVALID_PASSWORD_POLICY_ERROR_NAME) {
      await authLifecycleHookService.emitResetPassword('FAILURE', {
        ...resetPasswordPayload,
        reason: 'invalid_password_policy',
        ...toAuthErrorPayload(error),
      });
      sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, error instanceof Error ? error.message : 'Invalid password');
      return;
    }

    if (errorName === COGNITO_PASSWORD_ERRORS.COGNITO_CONFIG_ERROR_NAME) {
      await authLifecycleHookService.emitResetPassword('FAILURE', {
        ...resetPasswordPayload,
        reason: 'cognito_configuration_error',
        ...toAuthErrorPayload(error),
      });
      sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Password reset is currently unavailable');
      return;
    }

    if (errorName === COGNITO_ERRORS.CODE_MISMATCH) {
      await authLifecycleHookService.emitResetPassword('FAILURE', {
        ...resetPasswordPayload,
        reason: 'code_mismatch',
        ...toAuthErrorPayload(error),
      });
      sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, 'Invalid reset code');
      return;
    }

    if (errorName === COGNITO_ERRORS.EXPIRED_CODE) {
      await authLifecycleHookService.emitResetPassword('FAILURE', {
        ...resetPasswordPayload,
        reason: 'expired_code',
        ...toAuthErrorPayload(error),
      });
      sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, 'Reset code has expired');
      return;
    }

    if (errorName === COGNITO_ERRORS.LIMIT_EXCEEDED || errorName === COGNITO_ERRORS.TOO_MANY_REQUESTS) {
      await authLifecycleHookService.emitResetPassword('FAILURE', {
        ...resetPasswordPayload,
        reason: 'rate_limited',
        ...toAuthErrorPayload(error),
      });
      sendError(
        res,
        429,
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many requests. Please try again later.'
      );
      return;
    }

    await authLifecycleHookService.emitResetPassword('FAILURE', {
      ...resetPasswordPayload,
      reason: 'reset_password_failed',
      ...toAuthErrorPayload(error),
    });

    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Failed to reset password');
  }
});

export default router;
