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

      const data: RefreshResponse = await response.json();

      const tokens: AuthTokens = {
        idToken: data.idToken,
        accessToken: data.accessToken,
        expiresAt: Date.now() + data.expiresIn * 1000,
      };

      await this.storage.setTokens(tokens);

      // Decode ID token to extract user data
      try {
        const payload = this.decodeJWT(data.idToken);
        const user: User = {
          id: payload.sub,
          email: payload.email,
          name: payload.given_name,
          surname: payload.family_name,
          role: 'user', // Default role, will be updated from API if different
          isActive: true, // Default active status
        };
        await this.storage.setUser(user);
      } catch (decodeError) {
        console.error('Failed to decode ID token:', decodeError);
        return false;
      }

      this.config.onTokenRefresh?.(tokens);

      console.log('Tokens refreshed, expires at:', new Date(tokens.expiresAt));

      return true;
    } catch (error) {
      console.error('Silent refresh failed:', error);
      return false;
    }
  }

  /**
   * Decode JWT token (without verification - verification is done server-side)
   */
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Invalid JWT token');
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
