// ================================================================
// services/WebStorageAdapter.ts
// In-memory storage adapter for web (secure, lost on page refresh)
// ================================================================

import type { StorageAdapter, AuthTokens, User } from '@my-many-books/shared-auth';

export class WebStorageAdapter implements StorageAdapter {
  private tokens: AuthTokens | null = null;
  private user: User | null = null;

  getTokens(): Promise<AuthTokens | null> {
    return Promise.resolve(this.tokens);
  }

  setTokens(tokens: AuthTokens): Promise<void> {
    this.tokens = tokens;
    return Promise.resolve();
  }

  removeTokens(): Promise<void> {
    this.tokens = null;
    return Promise.resolve();
  }

  getUser(): Promise<User | null> {
    return Promise.resolve(this.user);
  }

  setUser(user: User): Promise<void> {
    this.user = user;
    return Promise.resolve();
  }

  removeUser(): Promise<void> {
    this.user = null;
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.tokens = null;
    this.user = null;
    return Promise.resolve();
  }
}
