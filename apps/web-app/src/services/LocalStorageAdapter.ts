// ================================================================
// services/LocalStorageAdapter.ts
// localStorage-based storage adapter for E2E testing
// WARNING: Only use for E2E tests. NOT for production (XSS vulnerability)
// ================================================================

import type { StorageAdapter, AuthTokens, User } from '@my-many-books/shared-auth';

export class LocalStorageAdapter implements StorageAdapter {
  private readonly TOKENS_KEY = 'auth_tokens';
  private readonly USER_KEY = 'auth_user';

  getTokens(): Promise<AuthTokens | null> {
    try {
      const stored = localStorage.getItem(this.TOKENS_KEY);
      return Promise.resolve(stored ? (JSON.parse(stored) as AuthTokens) : null);
    } catch {
      return Promise.resolve(null);
    }
  }

  setTokens(tokens: AuthTokens): Promise<void> {
    try {
      localStorage.setItem(this.TOKENS_KEY, JSON.stringify(tokens));
    } catch {
      // Ignore storage failures to preserve existing adapter behavior.
    }

    return Promise.resolve();
  }

  removeTokens(): Promise<void> {
    try {
      localStorage.removeItem(this.TOKENS_KEY);
    } catch {
      // Ignore storage failures to preserve existing adapter behavior.
    }

    return Promise.resolve();
  }

  getUser(): Promise<User | null> {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      return Promise.resolve(stored ? (JSON.parse(stored) as User) : null);
    } catch {
      return Promise.resolve(null);
    }
  }

  setUser(user: User): Promise<void> {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch {
      // Ignore storage failures to preserve existing adapter behavior.
    }

    return Promise.resolve();
  }

  removeUser(): Promise<void> {
    try {
      localStorage.removeItem(this.USER_KEY);
    } catch {
      // Ignore storage failures to preserve existing adapter behavior.
    }

    return Promise.resolve();
  }

  async clear(): Promise<void> {
    await this.removeTokens();
    await this.removeUser();
  }
}
