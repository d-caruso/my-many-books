// ================================================================
// src/services/auth/googleOAuth.ts
// Shared Google OAuth helpers for auth routes
// ================================================================

import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { CognitoJwtVerifier, VerifiedCognitoIdentity } from './cognitoJwtVerifier';

const GOOGLE_PROVIDER_NAME = process.env['COGNITO_GOOGLE_PROVIDER_NAME'] || 'Google';
const OAUTH_SCOPES = 'openid email profile';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const PKCE_CODE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;
const PKCE_CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9\-_]{43,128}$/;
const GOOGLE_PKCE_COOKIE_NAME = 'google_oauth_pkce_verifier';

export interface DecodedIdToken {
  sub: string;
  email: string;
  email_verified?: boolean | string;
  given_name?: string;
  family_name?: string;
  name?: string;
  identities?: VerifiedCognitoIdentity[];
}

export interface OAuthTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface OAuthStatePayload {
  platform: 'web' | 'mobile';
  nonce: string;
  ts: number;
}

interface BuildAuthorizeOptions {
  codeChallenge?: string;
}

const getCognitoJwtVerifier = (): CognitoJwtVerifier =>
  new CognitoJwtVerifier(
    process.env['AWS_REGION'] || 'us-east-1',
    process.env['COGNITO_USER_POOL_ID'] || '',
    process.env['COGNITO_USER_POOL_CLIENT_ID'] || ''
  );

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
};

const getOAuthStateSecret = (): string => {
  const configuredSecret = process.env['GOOGLE_OAUTH_STATE_SECRET']?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  const nodeEnv = process.env['NODE_ENV'];
  if (nodeEnv && nodeEnv !== 'development' && nodeEnv !== 'test') {
    throw new Error('GOOGLE_OAUTH_STATE_SECRET is not configured');
  }

  return 'local-google-oauth-state';
};

const getCognitoDomainBaseUrl = (): string => {
  const configuredDomain = process.env['COGNITO_DOMAIN']?.trim();
  if (!configuredDomain) {
    throw new Error('COGNITO_DOMAIN is not configured');
  }

  const withProtocol =
    configuredDomain.startsWith('http://') || configuredDomain.startsWith('https://')
      ? configuredDomain
      : `https://${configuredDomain}`;

  return withProtocol.replace(/\/+$/, '');
};

const toBase64Url = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64url');

const fromBase64Url = (value: string): string =>
  Buffer.from(value, 'base64url').toString('utf8');

export const createGoogleOAuthState = (platform: 'web' | 'mobile'): string => {
  const stateSecret = getOAuthStateSecret();
  const payload: OAuthStatePayload = {
    platform,
    nonce: crypto.randomBytes(12).toString('hex'),
    ts: Date.now(),
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', stateSecret)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
};

export const isValidGoogleOAuthState = (
  state: string,
  expectedPlatform: 'web' | 'mobile'
): boolean => {
  const stateSecret = getOAuthStateSecret();
  const parts = state.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', stateSecret)
    .update(encodedPayload)
    .digest('base64url');

  const providedSignatureBuffer = Buffer.from(signature, 'utf8');
  const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8');
  if (
    providedSignatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)
  ) {
    return false;
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as OAuthStatePayload;
  } catch {
    return false;
  }

  if (payload.platform !== expectedPlatform) {
    return false;
  }

  if (typeof payload.nonce !== 'string' || payload.nonce.length === 0) {
    return false;
  }

  if (typeof payload.ts !== 'number' || !Number.isFinite(payload.ts)) {
    return false;
  }

  if (payload.ts > Date.now() + 5 * 60 * 1000) {
    return false;
  }

  if (Date.now() - payload.ts > OAUTH_STATE_TTL_MS) {
    return false;
  }

  return true;
};

export const isAllowedMobileRedirectUri = (redirectUri: string): boolean => {
  const normalizedRedirectUri = redirectUri.trim();
  if (!normalizedRedirectUri) {
    return false;
  }

  const allowedRedirectUris = (process.env['GOOGLE_OAUTH_REDIRECT_URIS_MOBILE'] || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (allowedRedirectUris.length > 0) {
    return allowedRedirectUris.includes(normalizedRedirectUri);
  }

  const nodeEnv = process.env['NODE_ENV']?.trim().toLowerCase();
  const isNonDevelopmentEnv = !!nodeEnv && nodeEnv !== 'development' && nodeEnv !== 'test';
  if (isNonDevelopmentEnv) {
    return false;
  }

  const requiredPrefix = process.env['GOOGLE_OAUTH_REDIRECT_URI_MOBILE_PREFIX'] || 'my-many-books://';
  return normalizedRedirectUri.startsWith(requiredPrefix);
};

export const getWebCallbackUri = (req: Request, authCookiePath: string): string => {
  const configured = process.env['GOOGLE_OAUTH_REDIRECT_URI_WEB']?.trim();
  if (configured) {
    return configured;
  }

  return `${req.protocol}://${req.get('host')}${authCookiePath}/google/callback`;
};

export const isValidPkceCodeVerifier = (value: string): boolean =>
  PKCE_CODE_VERIFIER_PATTERN.test(value);

export const isValidPkceCodeChallenge = (value: string): boolean =>
  PKCE_CODE_CHALLENGE_PATTERN.test(value);

export const createPkceCodeVerifier = (): string => {
  const random = crypto.randomBytes(64).toString('base64url');
  return random.length > 128 ? random.slice(0, 128) : random;
};

export const buildPkceCodeChallenge = (codeVerifier: string): string =>
  crypto.createHash('sha256').update(codeVerifier).digest('base64url');

export const setGooglePkceVerifierCookie = (
  res: Response,
  codeVerifier: string,
  authCookiePath: string
): void => {
  res.cookie(GOOGLE_PKCE_COOKIE_NAME, codeVerifier, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    maxAge: OAUTH_STATE_TTL_MS,
    path: authCookiePath,
  });
};

export const clearGooglePkceVerifierCookie = (res: Response, authCookiePath: string): void => {
  res.clearCookie(GOOGLE_PKCE_COOKIE_NAME, { path: authCookiePath });
};

export const getGooglePkceVerifierFromCookie = (req: Request): string | null => {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[GOOGLE_PKCE_COOKIE_NAME];
  return typeof value === 'string' ? value : null;
};

export const buildGoogleAuthorizeUrl = (
  redirectUri: string,
  state: string,
  options: BuildAuthorizeOptions = {}
): string => {
  const authorizeUrl = new URL('/oauth2/authorize', getCognitoDomainBaseUrl());
  authorizeUrl.searchParams.set('identity_provider', GOOGLE_PROVIDER_NAME);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', getRequiredEnv('COGNITO_USER_POOL_CLIENT_ID'));
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', OAUTH_SCOPES);
  authorizeUrl.searchParams.set('state', state);
  if (options.codeChallenge) {
    authorizeUrl.searchParams.set('code_challenge', options.codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  }
  authorizeUrl.searchParams.set('prompt', 'select_account');
  return authorizeUrl.toString();
};

export const buildFrontendAuthRedirect = (
  status: 'success' | 'error',
  reason?: string
): string => {
  const frontendUrl = (process.env['FRONTEND_URL'] || 'http://localhost:3000').replace(/\/+$/, '');
  const redirectUrl = new URL('/auth', `${frontendUrl}/`);
  redirectUrl.searchParams.set('google', status);

  if (reason) {
    redirectUrl.searchParams.set('reason', reason);
  }

  return redirectUrl.toString();
};

export const verifyCognitoIdToken = async (token: string): Promise<DecodedIdToken> => {
  const verified = await getCognitoJwtVerifier().verifyIdToken(token);
  return {
    sub: verified.sub,
    email: verified.email,
    email_verified: verified.email_verified,
    given_name: verified.given_name,
    family_name: verified.family_name,
    name: verified.name,
    identities: verified.identities,
  };
};

export const isGoogleEmailVerified = (
  value: DecodedIdToken['email_verified']
): boolean => value === true || value === 'true';

export const setRefreshTokenCookie = (
  res: Response,
  refreshToken: string | undefined,
  authCookiePath: string
): void => {
  if (!refreshToken) {
    return;
  }

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: authCookiePath,
  });
};

export const exchangeOAuthCodeForTokens = async (
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<OAuthTokenResponse> => {
  const tokenUrl = `${getCognitoDomainBaseUrl()}/oauth2/token`;
  const clientId = getRequiredEnv('COGNITO_USER_POOL_CLIENT_ID');

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
  });

  const clientSecret = process.env['COGNITO_USER_POOL_CLIENT_SECRET']?.trim();
  if (clientSecret) {
    params.set('client_secret', clientSecret);
  }

  if (codeVerifier) {
    params.set('code_verifier', codeVerifier);
  }

  const response = await axios.post<OAuthTokenResponse>(tokenUrl, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data;
};
