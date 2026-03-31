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
import { COGNITO_PASSWORD_ERRORS, cognitoPasswordService } from '../services/auth/cognitoPasswordService';
import { AUTH_COOKIE_PATH } from '../constants/api';
import { COGNITO_ERRORS } from '../constants/cognito';
import { authLimiter, refreshLimiter } from '../middleware/rateLimiters';

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
router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
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

      if (errorName === COGNITO_ERRORS.USER_NOT_CONFIRMED || errorName === COGNITO_ERRORS.NOT_AUTHORIZED) {
        try {
          const getUserCommand = new AdminGetUserCommand({
            UserPoolId: process.env['COGNITO_USER_POOL_ID'] || '',
            Username: (req.body as LoginRequest).email,
          });
          const userResult = await cognitoClient.send(getUserCommand);
          if (userResult.UserStatus === 'UNCONFIRMED') {
            sendError(res, 401, ERROR_CODES.EMAIL_NOT_VERIFIED, 'Email not verified');
            return;
          }
        } catch {
          // user lookup failed, fall through to generic error
        }
        sendError(res, 401, ERROR_CODES.AUTH_FAILED, 'Invalid email or password');
        return;
      }

      if (errorName === COGNITO_ERRORS.USER_NOT_FOUND) {
        sendError(res, 401, ERROR_CODES.USER_NOT_FOUND, 'User not found');
        return;
      }
    }

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

router.get('/google/callback', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const cognitoError = typeof req.query['error'] === 'string' ? req.query['error'] : '';
  if (cognitoError) {
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

router.post('/google/mobile/exchange', authLimiter, async (req: Request, res: Response): Promise<void> => {
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

router.post('/refresh', refreshLimiter, async (req: Request, res: Response): Promise<void> => {
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

router.post('/logout', authLimiter, (_req: Request, res: Response): void => {
  res.clearCookie('refresh_token', { path: AUTH_COOKIE_PATH });
  let cognitoLogoutUrl: string | null = null;
  try {
    const frontendUrl = (process.env['FRONTEND_URL'] || 'http://localhost:3000').replace(/\/+$/, '');
    cognitoLogoutUrl = buildCognitoLogoutUrl(`${frontendUrl}/auth`);
  } catch {
    // Cognito not configured, skip
  }
  sendSuccess(res, 200, { cognitoLogoutUrl }, 'Logout successful');
});

router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
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

      if (errorName === COGNITO_ERRORS.USERNAME_EXISTS) {
        try {
          const getUserCommand = new AdminGetUserCommand({
            UserPoolId: process.env['COGNITO_USER_POOL_ID'] || '',
            Username: (req.body as RegisterRequest).email,
          });
          const userResult = await cognitoClient.send(getUserCommand);
          const isConfirmed = userResult.UserStatus === 'CONFIRMED';

          if (isConfirmed) {
            const existsInDb = await User.findOne({ where: { email: (req.body as RegisterRequest).email }, attributes: ['id'] });
            const code = existsInDb ? ERROR_CODES.CONFLICT : ERROR_CODES.EMAIL_REGISTERED_VIA_SOCIAL;
            sendError(res, 409, code, 'Email already registered');
          } else {
            sendError(res, 409, ERROR_CODES.EMAIL_NOT_VERIFIED, 'Email registered but not verified');
          }
        } catch {
          sendError(res, 409, ERROR_CODES.CONFLICT, 'Email already registered');
        }
        return;
      }

      if (errorName === COGNITO_ERRORS.INVALID_PASSWORD) {
        sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, 'Password does not meet requirements');
        return;
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Registration failed', { cause: errorMessage });
  }
});

router.post('/verify-email', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body as VerifyEmailRequest;

    if (!email || !code) {
      sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Email and verification code are required');
      return;
    }

    const command = new ConfirmSignUpCommand({
      ClientId: process.env['COGNITO_USER_POOL_CLIENT_ID'] || '',
      Username: email,
      ConfirmationCode: code,
    });

    await cognitoClient.send(command);

    sendSuccess(res, 200, { verified: true }, 'Email verified successfully');
  } catch (error: unknown) {
    getLogger().error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Email verification error:'
    );

    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as { name: string }).name;

      if (errorName === COGNITO_ERRORS.CODE_MISMATCH) {
        sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, 'Invalid verification code');
        return;
      }

      if (errorName === COGNITO_ERRORS.EXPIRED_CODE) {
        sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, 'Verification code has expired');
        return;
      }

      if (errorName === COGNITO_ERRORS.NOT_AUTHORIZED) {
        sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, 'Account already verified');
        return;
      }

      if (errorName === COGNITO_ERRORS.USER_NOT_FOUND) {
        sendError(res, 404, ERROR_CODES.USER_NOT_FOUND, 'User not found');
        return;
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Email verification failed', { cause: errorMessage });
  }
});

router.post('/resend-code', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as ResendCodeRequest;

    if (!email) {
      sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Email is required');
      return;
    }

    const command = new ResendConfirmationCodeCommand({
      ClientId: process.env['COGNITO_USER_POOL_CLIENT_ID'] || '',
      Username: email,
    });

    await cognitoClient.send(command);

    sendSuccess(res, 200, { sent: true }, 'Verification code resent');
  } catch (error: unknown) {
    getLogger().error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Resend verification code error:'
    );

    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as { name: string }).name;

      if (errorName === COGNITO_ERRORS.USER_NOT_FOUND) {
        sendError(res, 404, ERROR_CODES.USER_NOT_FOUND, 'User not found');
        return;
      }

      if (errorName === COGNITO_ERRORS.LIMIT_EXCEEDED) {
        sendError(res, 429, ERROR_CODES.RATE_LIMIT_EXCEEDED, 'Too many requests. Please try again later.');
        return;
      }

      if (errorName === COGNITO_ERRORS.CODE_DELIVERY_FAILURE) {
        sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Failed to deliver verification code');
        return;
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Failed to resend verification code', { cause: errorMessage });
  }
});

router.post('/forgot-password', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as ForgotPasswordRequest;
    if (!email || typeof email !== 'string') {
      sendError(res, 400, ERROR_CODES.INVALID_REQUEST_BODY, 'Email is required');
      return;
    }

    await cognitoPasswordService.requestForgotPassword({ email });

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
      sendError(
        res,
        429,
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many requests. Please try again later.'
      );
      return;
    }

    if (errorName === COGNITO_PASSWORD_ERRORS.COGNITO_CONFIG_ERROR_NAME) {
      sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Password reset is currently unavailable');
      return;
    }

    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Failed to process password reset request');
  }
});

router.post('/confirm-forgot-password', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
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

    await cognitoPasswordService.confirmForgotPassword({
      email,
      code,
      newPassword,
      locale,
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
      sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, error instanceof Error ? error.message : 'Invalid password');
      return;
    }

    if (errorName === COGNITO_PASSWORD_ERRORS.COGNITO_CONFIG_ERROR_NAME) {
      sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Password reset is currently unavailable');
      return;
    }

    if (errorName === COGNITO_ERRORS.CODE_MISMATCH) {
      sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, 'Invalid reset code');
      return;
    }

    if (errorName === COGNITO_ERRORS.EXPIRED_CODE) {
      sendError(res, 400, ERROR_CODES.VALIDATION_FAILED, 'Reset code has expired');
      return;
    }

    if (errorName === COGNITO_ERRORS.LIMIT_EXCEEDED || errorName === COGNITO_ERRORS.TOO_MANY_REQUESTS) {
      sendError(
        res,
        429,
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many requests. Please try again later.'
      );
      return;
    }

    sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Failed to reset password');
  }
});

export default router;
