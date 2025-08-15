/**
 * Authentication business logic manager - platform agnostic
 */

import { User, AuthUser } from '@my-many-books/shared-types';
import { isValidEmail } from '@my-many-books/shared-utils';

export interface AuthAPI {
  login(email: string, password: string): Promise<{ user: AuthUser; token: string }>;
  register(userData: RegisterData): Promise<{ user: AuthUser; token: string }>;
  logout(): Promise<void>;
  refreshToken(): Promise<{ token: string }>;
  getCurrentUser(): Promise<User>;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  surname: string;
}

export interface TokenStorage {
  getToken(): Promise<string | null> | string | null;
  setToken(token: string): Promise<void> | void;
  removeToken(): Promise<void> | void;
}

export class AuthManager {
  constructor(
    private api: AuthAPI,
    private tokenStorage: TokenStorage
  ) {}

  /**
   * Login with validation
   */
  async login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    // Validate email format
    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    try {
      const result = await this.api.login(email.toLowerCase().trim(), password);
      
      // Store token
      await this.tokenStorage.setToken(result.token);
      
      return result;
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  }

  /**
   * Register with validation
   */
  async register(userData: RegisterData): Promise<{ user: AuthUser; token: string }> {
    // Validate email
    if (!isValidEmail(userData.email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    if (!userData.password || userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Validate name
    if (!userData.name?.trim()) {
      throw new Error('First name is required');
    }

    if (!userData.surname?.trim()) {
      throw new Error('Last name is required');
    }

    // Check for strong password
    if (!this.isStrongPassword(userData.password)) {
      throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }

    try {
      const cleanedData: RegisterData = {
        email: userData.email.toLowerCase().trim(),
        password: userData.password,
        name: userData.name.trim(),
        surname: userData.surname.trim(),
      };

      const result = await this.api.register(cleanedData);
      
      // Store token
      await this.tokenStorage.setToken(result.token);
      
      return result;
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  }

  /**
   * Logout and clear tokens
   */
  async logout(): Promise<void> {
    try {
      await this.api.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Always remove token from storage
      await this.tokenStorage.removeToken();
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.tokenStorage.getToken();
      return !!token;
    } catch {
      return false;
    }
  }

  /**
   * Get current user with token refresh if needed
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const token = await this.tokenStorage.getToken();
      if (!token) {
        return null;
      }

      return await this.api.getCurrentUser();
    } catch (error: any) {
      // If token is invalid, try to refresh
      if (error.status === 401) {
        try {
          const refreshResult = await this.api.refreshToken();
          await this.tokenStorage.setToken(refreshResult.token);
          return await this.api.getCurrentUser();
        } catch {
          // Refresh failed, user needs to login again
          await this.tokenStorage.removeToken();
          return null;
        }
      }
      throw error;
    }
  }

  /**
   * Validate password strength
   */
  private isStrongPassword(password: string): boolean {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return hasUpperCase && hasLowerCase && hasNumbers;
  }

  /**
   * Check password requirements
   */
  static validatePasswordRequirements(password: string): {
    isValid: boolean;
    requirements: {
      length: boolean;
      uppercase: boolean;
      lowercase: boolean;
      number: boolean;
    };
  } {
    const requirements = {
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    };

    const isValid = Object.values(requirements).every(req => req);

    return { isValid, requirements };
  }
}