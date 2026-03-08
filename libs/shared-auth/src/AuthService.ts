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
    if (payload && typeof payload === 'object' && 'success' in payload) {
      const maybeEnvelope = payload as Partial<ApiSuccessEnvelope<T>>;
      if (maybeEnvelope.success === true && 'data' in maybeEnvelope) {
        return {
          data: maybeEnvelope.data as T,
          message: maybeEnvelope.message,
        };
      }
    }

    throw new Error('Invalid API success envelope');
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
    try {
      const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.LOGIN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Send/receive cookies
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => undefined);
        const { code, message } = this.extractApiError(errorPayload, 'Login failed');
        throw new AuthApiError(code, message, getAuthErrorI18nKey(code));
      }

      const payload = await response.json() as unknown;
      const { data } = this.unwrapEnvelopeData<LoginResponse>(payload);
      return await this.applyLoginResponse(data);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async loginWithGoogleCode(payload: {
    code: string;
    state: string;
    redirectUri: string;
    codeVerifier: string;
  }): Promise<User> {
    try {
      const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.GOOGLE_MOBILE_EXCHANGE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => undefined);
        const { code, message } = this.extractApiError(errorPayload, 'Google login failed');
        throw new AuthApiError(code, message, getAuthErrorI18nKey(code));
      }

      const responseBody = await response.json() as unknown;
      const { data } = this.unwrapEnvelopeData<LoginResponse>(responseBody);
      return await this.applyLoginResponse(data);
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    surname: string;
    locale?: string;
  }): Promise<RegisterResponse> {
    try {
      const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.REGISTER), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => undefined);
        const { code, message } = this.extractApiError(errorPayload, 'Registration failed');
        throw new AuthApiError(code, message, getAuthErrorI18nKey(code));
      }

      const payload = await response.json() as unknown;
      const { data, message } = this.unwrapEnvelopeData<RegisterResponseData>(payload);

      if (typeof data?.requiresVerification !== 'boolean') {
        throw new Error('Invalid API success envelope');
      }

      return {
        success: true,
        requiresVerification: data.requiresVerification,
        message: message || 'Registration successful',
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async logout(): Promise<string | null> {
    let cognitoLogoutUrl: string | null = null;
    try {
      const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.LOGOUT), {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        const payload = await response.json().catch(() => undefined);
        try {
          const { data } = this.unwrapEnvelopeData<{ cognitoLogoutUrl: string | null }>(payload);
          cognitoLogoutUrl = data?.cognitoLogoutUrl ?? null;
        } catch {
          // old API without cognitoLogoutUrl
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
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
    } catch (error) {
      console.error('Auth state check failed:', error);
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

      const payload = await response.json() as unknown;
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
    } catch (error) {
      console.error('Silent refresh failed:', error);
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
    try {
      const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.VERIFY_EMAIL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => undefined);
        const { code, message } = this.extractApiError(errorPayload, 'Email verification failed');
        throw new AuthApiError(code, message, getAuthErrorI18nKey(code));
      }
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  async resendCode(email: string): Promise<void> {
    try {
      const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.RESEND_CODE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => undefined);
        const { code, message } = this.extractApiError(errorPayload, 'Failed to resend verification code');
        throw new AuthApiError(code, message, getAuthErrorI18nKey(code));
      }
    } catch (error) {
      console.error('Resend verification code error:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    return await this.storage.getUser();
  }

  async changePassword(input: ChangePasswordInput): Promise<User> {
    try {
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
        const errorPayload = await response.json().catch(() => undefined);
        const { code, message } = this.extractApiError(errorPayload, 'Password change failed');
        throw new AuthApiError(code, message, getAuthErrorI18nKey(code));
      }

      const payload = (await response.json()) as unknown;
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
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  async requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
    try {
      const response = await fetch(this.buildApiUrl(AUTH_ENDPOINTS.FORGOT_PASSWORD), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => undefined);
        const { code, message } = this.extractApiError(
          errorPayload,
          'Failed to process password reset request'
        );
        throw new AuthApiError(code, message, getAuthErrorI18nKey(code));
      }

      const payload = (await response.json()) as unknown;
      const { data } = this.unwrapEnvelopeData<ForgotPasswordResponse>(payload);
      return data;
    } catch (error) {
      console.error('Request password reset error:', error);
      throw error;
    }
  }

  async confirmPasswordReset(input: ConfirmPasswordResetInput): Promise<ConfirmPasswordResetResponse> {
    try {
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
        const errorPayload = await response.json().catch(() => undefined);
        const { code, message } = this.extractApiError(errorPayload, 'Failed to reset password');
        throw new AuthApiError(code, message, getAuthErrorI18nKey(code));
      }

      const payload = (await response.json()) as unknown;
      const { data } = this.unwrapEnvelopeData<ConfirmPasswordResetResponse>(payload);
      return data;
    } catch (error) {
      console.error('Confirm password reset error:', error);
      throw error;
    }
  }
}
