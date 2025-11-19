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
} from './types';

export class AuthService {
  private storage: StorageAdapter;
  private config: AuthServiceConfig;

  constructor(config: AuthServiceConfig) {
    this.config = config;
    this.storage = config.storage;
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
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data: LoginResponse = await response.json();

      // Store access token in memory (via adapter)
      const tokens: AuthTokens = {
        idToken: data.idToken,
        accessToken: data.accessToken,
        expiresAt: Date.now() + data.expiresIn * 1000,
      };

      await this.storage.setTokens(tokens);
      await this.storage.setUser(data.user);

      this.config.onAuthStateChange?.(data.user);

      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    surname: string;
  }): Promise<RegisterResponse> {
    try {
      const response = await fetch(`${this.config.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      return await response.json();
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
      let tokens = await this.storage.getTokens();

      // Check if access token expired
      if (!tokens || Date.now() >= tokens.expiresAt) {
        // Try silent refresh
        const refreshed = await this.silentRefresh();

        if (!refreshed) {
          await this.storage.clear();
          return { user: null, isAuthenticated: false };
        }

        tokens = await this.storage.getTokens();
      }

      // Get cached user
      const user = await this.storage.getUser();

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

      const data: RefreshResponse = await response.json();

      const tokens: AuthTokens = {
        idToken: data.idToken,
        accessToken: data.accessToken,
        expiresAt: Date.now() + data.expiresIn * 1000,
      };

      await this.storage.setTokens(tokens);
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
