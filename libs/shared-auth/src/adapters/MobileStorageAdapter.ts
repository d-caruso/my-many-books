// ================================================================
// adapters/MobileStorageAdapter.ts
// SecureStore adapter for React Native (persistent, encrypted)
// ================================================================

import type { StorageAdapter, AuthTokens, User } from '../types';

export class MobileStorageAdapter implements StorageAdapter {
  private tokenKey = 'auth_tokens';
  private userKey = 'auth_user';
  private SecureStore: typeof import('expo-secure-store') | null = null;

  constructor() {
    // Dynamically import SecureStore (optional dependency)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.SecureStore = require('expo-secure-store');
    } catch (error) {
      console.warn('expo-secure-store not available. MobileStorageAdapter will not work.');
    }
  }

  async getTokens(): Promise<AuthTokens | null> {
    if (!this.SecureStore) {
      throw new Error('expo-secure-store not available');
    }

    try {
      const data = await this.SecureStore.getItemAsync(this.tokenKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get tokens:', error);
      return null;
    }
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    if (!this.SecureStore) {
      throw new Error('expo-secure-store not available');
    }

    try {
      await this.SecureStore.setItemAsync(this.tokenKey, JSON.stringify(tokens));
    } catch (error) {
      console.error('Failed to set tokens:', error);
      throw error;
    }
  }

  async removeTokens(): Promise<void> {
    if (!this.SecureStore) {
      throw new Error('expo-secure-store not available');
    }

    try {
      await this.SecureStore.deleteItemAsync(this.tokenKey);
    } catch (error) {
      console.error('Failed to remove tokens:', error);
    }
  }

  async getUser(): Promise<User | null> {
    if (!this.SecureStore) {
      throw new Error('expo-secure-store not available');
    }

    try {
      const data = await this.SecureStore.getItemAsync(this.userKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  async setUser(user: User): Promise<void> {
    if (!this.SecureStore) {
      throw new Error('expo-secure-store not available');
    }

    try {
      await this.SecureStore.setItemAsync(this.userKey, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to set user:', error);
      throw error;
    }
  }

  async removeUser(): Promise<void> {
    if (!this.SecureStore) {
      throw new Error('expo-secure-store not available');
    }

    try {
      await this.SecureStore.deleteItemAsync(this.userKey);
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  }

  async clear(): Promise<void> {
    await Promise.all([this.removeTokens(), this.removeUser()]);
  }
}
