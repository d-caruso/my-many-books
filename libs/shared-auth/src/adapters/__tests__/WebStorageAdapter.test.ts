// ================================================================
// adapters/__tests__/WebStorageAdapter.test.ts
// Unit tests for WebStorageAdapter
// ================================================================

import { WebStorageAdapter } from '../WebStorageAdapter';
import type { AuthTokens, User } from '../../types';

describe('WebStorageAdapter', () => {
  let adapter: WebStorageAdapter;

  beforeEach(() => {
    adapter = new WebStorageAdapter();
  });

  describe('tokens management', () => {
    it('should store and retrieve tokens', async () => {
      const tokens: AuthTokens = {
        idToken: 'id-token',
        accessToken: 'access-token',
        expiresAt: Date.now() + 3600000,
      };

      await adapter.setTokens(tokens);
      const retrieved = await adapter.getTokens();

      expect(retrieved).toEqual(tokens);
    });

    it('should return null when no tokens', async () => {
      const tokens = await adapter.getTokens();

      expect(tokens).toBeNull();
    });

    it('should remove tokens', async () => {
      const tokens: AuthTokens = {
        idToken: 'id-token',
        accessToken: 'access-token',
        expiresAt: Date.now() + 3600000,
      };

      await adapter.setTokens(tokens);
      await adapter.removeTokens();
      const retrieved = await adapter.getTokens();

      expect(retrieved).toBeNull();
    });
  });

  describe('user management', () => {
    it('should store and retrieve user', async () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        surname: 'User',
        role: 'user',
        isActive: true,
      };

      await adapter.setUser(user);
      const retrieved = await adapter.getUser();

      expect(retrieved).toEqual(user);
    });

    it('should return null when no user', async () => {
      const user = await adapter.getUser();

      expect(user).toBeNull();
    });

    it('should remove user', async () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        surname: 'User',
        role: 'user',
        isActive: true,
      };

      await adapter.setUser(user);
      await adapter.removeUser();
      const retrieved = await adapter.getUser();

      expect(retrieved).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all data', async () => {
      const tokens: AuthTokens = {
        idToken: 'id-token',
        accessToken: 'access-token',
        expiresAt: Date.now() + 3600000,
      };

      const user: User = {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        surname: 'User',
        role: 'user',
        isActive: true,
      };

      await adapter.setTokens(tokens);
      await adapter.setUser(user);
      await adapter.clear();

      expect(await adapter.getTokens()).toBeNull();
      expect(await adapter.getUser()).toBeNull();
    });
  });

  describe('in-memory storage characteristics', () => {
    it('should lose data when adapter is recreated', async () => {
      const tokens: AuthTokens = {
        idToken: 'id-token',
        accessToken: 'access-token',
        expiresAt: Date.now() + 3600000,
      };

      await adapter.setTokens(tokens);

      // Simulate page refresh by creating new adapter
      const newAdapter = new WebStorageAdapter();
      const retrieved = await newAdapter.getTokens();

      expect(retrieved).toBeNull();
    });
  });
});
