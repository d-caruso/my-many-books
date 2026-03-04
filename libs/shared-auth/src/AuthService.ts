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
  AuthState,
  ApiSuccessEnvelope,
  ApiErrorEnvelope,
} from './types';

interface RegisterResponseData {
  requiresVerification: boolean;
}

export class AuthService {
  private storage: StorageAdapter;
  private config: AuthServiceConfig;

  constructor(config: AuthServiceConfig) {
    this.config = config;
    this.storage = config.storage;
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

  private extractErrorMessage(payload: unknown, fallback: string): string {
    if (!payload || typeof payload !== 'object') {
      return fallback;
    }

    const maybeEnvelope = payload as Partial<ApiErrorEnvelope> & { message?: unknown };

    if (typeof maybeEnvelope.error === 'string' && maybeEnvelope.error.length > 0) {
      return maybeEnvelope.error;
    }

    if (
      maybeEnvelope.error &&
      typeof maybeEnvelope.error === 'object' &&
      'message' in maybeEnvelope.error &&
      typeof maybeEnvelope.error.message === 'string'
    ) {
      return maybeEnvelope.error.message;
    }

    if (typeof maybeEnvelope.message === 'string' && maybeEnvelope.message.length > 0) {
      return maybeEnvelope.message;
    }

    return fallback;
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
      const response = await fetch(`${this.config.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Send/receive cookies
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => undefined);
        throw new Error(this.extractErrorMessage(errorPayload, 'Login failed'));
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
      const response = await fetch(`${this.config.apiUrl}/auth/google/mobile/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => undefined);
        throw new Error(this.extractErrorMessage(errorPayload, 'Google login failed'));
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
      const response = await fetch(`${this.config.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => undefined);
        throw new Error(this.extractErrorMessage(errorPayload, 'Registration failed'));
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

  async logout(): Promise<void> {
    try {
      await fetch(`${this.config.apiUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.storage.clear();
      this.config.onAuthStateChange?.(null);
    }
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
      const response = await fetch(`${this.config.apiUrl}/auth/refresh`, {
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

  async getCurrentUser(): Promise<User | null> {
    return await this.storage.getUser();
  }
}
