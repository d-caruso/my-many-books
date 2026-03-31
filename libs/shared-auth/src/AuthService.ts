// ================================================================
// AuthService.ts
// Core authentication service with platform-agnostic logic
// ================================================================

import type {
  User,
  AuthTokens,
  StorageAdapter,
  AuthServiceConfig,
  LoginResponse,
  RefreshResponse,
  RegisterResponse,
  ChangePasswordResponse,
  ForgotPasswordResponse,
  ConfirmPasswordResetResponse,
  AuthState,
  ApiSuccessEnvelope,
  ApiErrorEnvelope,
} from './types';
import { AuthApiError } from './AuthApiError';
import { getAuthErrorI18nKey } from './authErrorI18n';
import { AUTH_ENDPOINTS, USER_ACCOUNT_PATCH_ACTIONS } from '@my-many-books/shared-types';

interface RegisterResponseData {
  requiresVerification: boolean;
}

interface ChangePasswordInput {
  userId: number;
  currentPassword: string;
  newPassword: string;
  locale?: string;
}

interface ConfirmPasswordResetInput {
  email: string;
  code: string;
  newPassword: string;
  locale?: string;
}

const USERS_ENDPOINT = '/users';

export class AuthService {
  private storage: StorageAdapter;
  private config: AuthServiceConfig;

  constructor(config: AuthServiceConfig) {
    this.config = config;
    this.storage = config.storage;
  }

  private buildApiUrl(path: string): string {
    return `${this.config.apiUrl}${path}`;
  }

  private unwrapEnvelopeData<T>(payload: unknown): { data: T; message?: string } {
    if (
      payload !== null &&
      typeof payload === 'object' &&
      'success' in payload &&
      'data' in payload &&
      (payload as Record<string, unknown>).success === true
    ) {
      const envelope = payload as ApiSuccessEnvelope<T>;
      return { data: envelope.data, message: envelope.message };
    }

    throw new Error('Invalid API success envelope');
  }

  private async throwIfError(response: Response, fallback: string): Promise<void> {
    if (response.ok) return;
    if (response.status === 429) {
      throw new AuthApiError('RATE_LIMIT_EXCEEDED', 'Too many requests', getAuthErrorI18nKey('RATE_LIMIT_EXCEEDED'));
    }
    const payload = await this.readJsonPayloadOrUndefined(response);
    const { code, message } = this.extractApiError(payload, fallback);
    throw new AuthApiError(code, message, getAuthErrorI18nKey(code));
  }

  private extractApiError(
    payload: unknown,
    fallback: string,
  ): { code: string; message: string } {
    if (!payload || typeof payload !== 'object') {
      return { code: 'INTERNAL_ERROR', message: fallback };
    }

    const maybeEnvelope = payload as Partial<ApiErrorEnvelope> & { message?: unknown };

    if (typeof maybeEnvelope.error === 'string' && maybeEnvelope.error.length > 0) {
      return { code: 'INTERNAL_ERROR', message: maybeEnvelope.error };
    }

    if (
      maybeEnvelope.error &&
      typeof maybeEnvelope.error === 'object' &&
      'message' in maybeEnvelope.error &&
      typeof maybeEnvelope.error.message === 'string'
    ) {
      const code =
        'code' in maybeEnvelope.error && typeof maybeEnvelope.error.code === 'string'
          ? maybeEnvelope.error.code
          : 'INTERNAL_ERROR';
      return { code, message: maybeEnvelope.error.message };
    }

    if (typeof maybeEnvelope.message === 'string' && maybeEnvelope.message.length > 0) {
      return { code: 'INTERNAL_ERROR', message: maybeEnvelope.message };
    }

    return { code: 'INTERNAL_ERROR', message: fallback };
  }

  private async readJsonPayload(response: Response): Promise<unknown> {
    return (await response.json()) as unknown;
  }

  private async readJsonPayloadOrUndefined(response: Response): Promise<unknown> {
    try {
      return await this.readJsonPayload(response);
    } catch {
      return undefined;
    }
  }

  private async applyLoginResponse(data: LoginResponse): Promise<User> {
    const tokens: AuthTokens = {
      idToken: data.idToken,
      accessToken: data.accessToken,
      expiresAt: Date.now() + data.expiresIn * 1000,
    };

    await this.storage.setTokens(tokens);
    await this.storage.setUser(data.user);

    this.config.onAuthStateChange?.(data.user);

    return data.user;
  }

  async login(email: string, password: string): Promise<User> {
    const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.LOGIN), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send/receive cookies
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      await this.throwIfError(response,'Login failed');
    }

    const payload = await this.readJsonPayload(response);
    const { data } = this.unwrapEnvelopeData<LoginResponse>(payload);
    return await this.applyLoginResponse(data);
  }

  async loginWithGoogleCode(payload: {
    code: string;
    state: string;
    redirectUri: string;
    codeVerifier: string;
  }): Promise<User> {
    const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.GOOGLE_MOBILE_EXCHANGE), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await this.throwIfError(response,'Google login failed');
    }

    const responseBody = await this.readJsonPayload(response);
    const { data } = this.unwrapEnvelopeData<LoginResponse>(responseBody);
    return await this.applyLoginResponse(data);
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    surname: string;
    locale?: string;
  }): Promise<RegisterResponse> {
    const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.REGISTER), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      await this.throwIfError(response,'Registration failed');
    }

    const payload = await this.readJsonPayload(response);
    const { data, message } = this.unwrapEnvelopeData<RegisterResponseData>(payload);

    if (typeof data?.requiresVerification !== 'boolean') {
      throw new Error('Invalid API success envelope');
    }

    return {
      success: true,
      requiresVerification: data.requiresVerification,
      message: message || 'Registration successful',
    };
  }

  async logout(): Promise<string | null> {
    let cognitoLogoutUrl: string | null = null;
    try {
      const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.LOGOUT), {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        const payload = await this.readJsonPayloadOrUndefined(response);
        try {
          const { data } = this.unwrapEnvelopeData<{ cognitoLogoutUrl: string | null }>(payload);
          cognitoLogoutUrl = data?.cognitoLogoutUrl ?? null;
        } catch {
          // old API without cognitoLogoutUrl
        }
      }
    } catch {
      // Ignore logout API errors and clear local auth state in finally.
    } finally {
      await this.storage.clear();
      this.config.onAuthStateChange?.(null);
    }
    return cognitoLogoutUrl;
  }

  async getAuthState(): Promise<AuthState> {
    try {
      const tokens = await this.storage.getTokens();
      const user = await this.storage.getUser();

      // Check if access token expired or not available
      if (!tokens || Date.now() >= tokens.expiresAt) {
        // Try silent refresh (which will also restore user data)
        const refreshed = await this.silentRefresh();

        if (!refreshed) {
          await this.storage.clear();
          return { user: null, isAuthenticated: false };
        }

        // After successful refresh, user should be restored
        const refreshedUser = await this.storage.getUser();

        if (!refreshedUser) {
          await this.storage.clear();
          return { user: null, isAuthenticated: false };
        }

        return { user: refreshedUser, isAuthenticated: true };
      }

      // User should exist if tokens exist
      if (!user) {
        await this.storage.clear();
        return { user: null, isAuthenticated: false };
      }

      return { user, isAuthenticated: true };
    } catch {
      await this.storage.clear();
      return { user: null, isAuthenticated: false };
    }
  }

  async silentRefresh(): Promise<boolean> {
    try {
      const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.REFRESH), {
        method: 'POST',
        credentials: 'include', // Send refresh_token cookie
      });

      if (!response.ok) {
        return false;
      }

      const payload = await this.readJsonPayload(response);
      const { data } = this.unwrapEnvelopeData<RefreshResponse>(payload);

      const tokens: AuthTokens = {
        idToken: data.idToken,
        accessToken: data.accessToken,
        expiresAt: Date.now() + data.expiresIn * 1000,
      };

      if (!data.user) {
        throw new Error('Refresh response missing user');
      }

      await this.storage.setTokens(tokens);
      await this.storage.setUser(data.user);

      this.config.onTokenRefresh?.(tokens);

      return true;
    } catch {
      return false;
    }
  }


  async getIdToken(): Promise<string | null> {
    const tokens = await this.storage.getTokens();

    if (!tokens) {
      return null;
    }

    // Check if expired
    if (Date.now() >= tokens.expiresAt) {
      const refreshed = await this.silentRefresh();
      if (!refreshed) {
        return null;
      }
      const newTokens = await this.storage.getTokens();
      return newTokens?.idToken || null;
    }

    return tokens.idToken;
  }

  async getAccessToken(): Promise<string | null> {
    const tokens = await this.storage.getTokens();

    if (!tokens) {
      return null;
    }

    // Check if expired
    if (Date.now() >= tokens.expiresAt) {
      const refreshed = await this.silentRefresh();
      if (!refreshed) {
        return null;
      }
      const newTokens = await this.storage.getTokens();
      return newTokens?.accessToken || null;
    }

    return tokens.accessToken;
  }

  async updateUser(userData: Partial<User>): Promise<void> {
    const currentUser = await this.storage.getUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      await this.storage.setUser(updatedUser);
      this.config.onAuthStateChange?.(updatedUser);
    }
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.VERIFY_EMAIL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
      await this.throwIfError(response,'Email verification failed');
    }
  }

  async resendCode(email: string): Promise<void> {
    const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.RESEND_CODE), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      await this.throwIfError(response,'Failed to resend verification code');
    }
  }

  async getCurrentUser(): Promise<User | null> {
    return await this.storage.getUser();
  }

  async changePassword(input: ChangePasswordInput): Promise<User> {
    const idToken = await this.getIdToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch(this.buildApiUrl(`${USERS_ENDPOINT}/${input.userId}`), {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        action: USER_ACCOUNT_PATCH_ACTIONS.CHANGE_PASSWORD,
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        locale: input.locale,
      }),
    });

    if (!response.ok) {
      await this.throwIfError(response,'Password change failed');
    }

    const payload = await this.readJsonPayload(response);
    const { data } = this.unwrapEnvelopeData<ChangePasswordResponse>(payload);

    if (!data.changed) {
      throw new Error('Password was not changed');
    }

    return await this.applyLoginResponse({
      accessToken: data.accessToken,
      idToken: data.idToken,
      expiresIn: data.expiresIn,
      user: data.user,
    });
  }

  async requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
    const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.FORGOT_PASSWORD), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      await this.throwIfError(response,'Failed to process password reset request');
    }

    const payload = await this.readJsonPayload(response);
    const { data } = this.unwrapEnvelopeData<ForgotPasswordResponse>(payload);
    return data;
  }

  async confirmPasswordReset(input: ConfirmPasswordResetInput): Promise<ConfirmPasswordResetResponse> {
    const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.CONFIRM_FORGOT_PASSWORD), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: input.email,
        code: input.code,
        newPassword: input.newPassword,
        locale: input.locale,
      }),
    });

    if (!response.ok) {
      await this.throwIfError(response,'Failed to reset password');
    }

    const payload = await this.readJsonPayload(response);
    const { data } = this.unwrapEnvelopeData<ConfirmPasswordResetResponse>(payload);
    return data;
  }
}
