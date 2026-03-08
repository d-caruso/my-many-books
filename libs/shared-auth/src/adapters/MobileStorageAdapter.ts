// ================================================================
// adapters/MobileStorageAdapter.ts
// SecureStore adapter for React Native (persistent, encrypted)
// ================================================================

import type { StorageAdapter, AuthTokens, User } from '../types';

const TOKEN_KEY = 'auth_tokens';
const USER_KEY = 'auth_user';
const SECURE_STORE_PACKAGE_NAME = 'expo-secure-store';
const SECURE_STORE_UNAVAILABLE_ERROR = `${SECURE_STORE_PACKAGE_NAME} not available`;
const USER_ROLE_USER: User['role'] = 'user';
const USER_ROLE_ADMIN: User['role'] = 'admin';

type SecureStoreModule = typeof import('expo-secure-store');
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

function parseJson(value: string): unknown {
  return JSON.parse(value);
}

export class MobileStorageAdapter implements StorageAdapter {
  private readonly tokenKey = TOKEN_KEY;
  private readonly userKey = USER_KEY;
  private secureStorePromise: Promise<SecureStoreModule | null> | null = null;

  private async getSecureStore(): Promise<SecureStoreModule> {
    if (!this.secureStorePromise) {
      this.secureStorePromise = import(SECURE_STORE_PACKAGE_NAME)
        .then((module) => module)
        .catch(() => null);
    }

    const secureStore = await this.secureStorePromise;
    if (!secureStore) {
      throw new Error(SECURE_STORE_UNAVAILABLE_ERROR);
    }

    return secureStore;
  }

  private parseTokens(data: string): AuthTokens | null {
    const parsed = parseJson(data);
    return isAuthTokens(parsed) ? parsed : null;
  }

  private parseUser(data: string): User | null {
    const parsed = parseJson(data);
    return isUser(parsed) ? parsed : null;
  }

  async getTokens(): Promise<AuthTokens | null> {
    const secureStore = await this.getSecureStore();

    try {
      const data = await secureStore.getItemAsync(this.tokenKey);
      return data ? this.parseTokens(data) : null;
    } catch {
      return null;
    }
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    const secureStore = await this.getSecureStore();
    await secureStore.setItemAsync(this.tokenKey, JSON.stringify(tokens));
  }

  async removeTokens(): Promise<void> {
    const secureStore = await this.getSecureStore();

    try {
      await secureStore.deleteItemAsync(this.tokenKey);
    } catch {
      // Preserve adapter behavior: failures while clearing tokens are non-fatal.
    }
  }

  async getUser(): Promise<User | null> {
    const secureStore = await this.getSecureStore();

    try {
      const data = await secureStore.getItemAsync(this.userKey);
      return data ? this.parseUser(data) : null;
    } catch {
      return null;
    }
  }

  async setUser(user: User): Promise<void> {
    const secureStore = await this.getSecureStore();
    await secureStore.setItemAsync(this.userKey, JSON.stringify(user));
  }

  async removeUser(): Promise<void> {
    const secureStore = await this.getSecureStore();

    try {
      await secureStore.deleteItemAsync(this.userKey);
    } catch {
      // Preserve adapter behavior: failures while clearing user are non-fatal.
    }
  }

  async clear(): Promise<void> {
    await Promise.all([this.removeTokens(), this.removeUser()]);
  }
}
