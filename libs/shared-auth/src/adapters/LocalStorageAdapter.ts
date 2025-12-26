// ================================================================
// adapters/LocalStorageAdapter.ts
// localStorage-based storage adapter for E2E testing
// WARNING: Only use for E2E tests. NOT for production (XSS vulnerability)
// ================================================================

import type { StorageAdapter, AuthTokens, User } from '../types';

export class LocalStorageAdapter implements StorageAdapter {
  private readonly TOKENS_KEY = 'auth_tokens';
  private readonly USER_KEY = 'auth_user';

  async getTokens(): Promise<AuthTokens | null> {
    try {
      const stored = localStorage.getItem(this.TOKENS_KEY);
      return stored ? JSON.parse(stored) as AuthTokens : null;
    } catch {
      return null;
    }
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    try {
      localStorage.setItem(this.TOKENS_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  async removeTokens(): Promise<void> {
    try {
      localStorage.removeItem(this.TOKENS_KEY);
    } catch (error) {
      console.error('Failed to remove tokens:', error);
    }
  }

  async getUser(): Promise<User | null> {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      return stored ? JSON.parse(stored) as User : null;
    } catch {
      return null;
    }
  }

  async setUser(user: User): Promise<void> {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user:', error);
    }
  }

  async removeUser(): Promise<void> {
    try {
      localStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  }

  async clear(): Promise<void> {
    await this.removeTokens();
    await this.removeUser();
  }
}
