// ================================================================
// adapters/WebStorageAdapter.ts
// In-memory storage adapter for web (secure, lost on page refresh)
// ================================================================

import type { StorageAdapter, AuthTokens, User } from '../types';

export class WebStorageAdapter implements StorageAdapter {
  private tokens: AuthTokens | null = null;
  private user: User | null = null;

  async getTokens(): Promise<AuthTokens | null> {
    return this.tokens;
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    this.tokens = tokens;
  }

  async removeTokens(): Promise<void> {
    this.tokens = null;
  }

  async getUser(): Promise<User | null> {
    return this.user;
  }

  async setUser(user: User): Promise<void> {
    this.user = user;
  }

  async removeUser(): Promise<void> {
    this.user = null;
  }

  async clear(): Promise<void> {
    this.tokens = null;
    this.user = null;
  }
}
