// ================================================================
// services/MobileStorageAdapter.ts
// SecureStore adapter for React Native (persistent, encrypted)
// ================================================================

import type { StorageAdapter, AuthTokens, User } from '@my-many-books/shared-auth';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_tokens';
const USER_KEY = 'auth_user';
const USER_ROLE_USER: User['role'] = 'user';
const USER_ROLE_ADMIN: User['role'] = 'admin';

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function isAuthTokens(value: unknown): value is AuthTokens {
  if (!isJsonRecord(value)) {
    return false;
  }

  return (
    typeof value.idToken === 'string' &&
    typeof value.accessToken === 'string' &&
    typeof value.expiresAt === 'number'
  );
}

function isUserRole(value: unknown): value is User['role'] {
  return value === USER_ROLE_USER || value === USER_ROLE_ADMIN;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isUser(value: unknown): value is User {
  if (!isJsonRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'number' &&
    typeof value.email === 'string' &&
    typeof value.name === 'string' &&
    typeof value.surname === 'string' &&
    isUserRole(value.role) &&
    typeof value.isActive === 'boolean' &&
    isOptionalString(value.creationDate) &&
    isOptionalString(value.updateDate)
  );
}

export class MobileStorageAdapter implements StorageAdapter {
  async getTokens(): Promise<AuthTokens | null> {
    try {
      const data = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!data) return null;
      const parsed: unknown = JSON.parse(data);
      return isAuthTokens(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
  }

  async removeTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // non-fatal
    }
  }

  async getUser(): Promise<User | null> {
    try {
      const data = await SecureStore.getItemAsync(USER_KEY);
      if (!data) return null;
      const parsed: unknown = JSON.parse(data);
      return isUser(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async setUser(user: User): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  }

  async removeUser(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      // non-fatal
    }
  }

  async clear(): Promise<void> {
    await Promise.all([this.removeTokens(), this.removeUser()]);
  }
}
