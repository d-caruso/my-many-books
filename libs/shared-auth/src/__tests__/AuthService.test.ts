// ================================================================
// __tests__/AuthService.test.ts
// Unit tests for AuthService
// ================================================================

import { AuthService } from '../AuthService';
import type { StorageAdapter, AuthTokens, User } from '../types';

// Mock storage adapter
class MockStorageAdapter implements StorageAdapter {
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

// Mock fetch
global.fetch = jest.fn();

describe('AuthService', () => {
  let authService: AuthService;
  let mockStorage: MockStorageAdapter;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    mockStorage = new MockStorageAdapter();
    authService = new AuthService({
      storage: mockStorage,
      apiUrl: 'http://localhost:3000/api/v1',
    });
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          idToken: 'mock-id-token',
          accessToken: 'mock-access-token',
          expiresIn: 3600,
          user: {
            id: 1,
            email: 'test@example.com',
            name: 'Test',
            surname: 'User',
            role: 'user' as const,
            isActive: true,
          },
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const user = await authService.login('test@example.com', 'password');

      expect(user.email).toBe('test@example.com');
      expect(await mockStorage.getTokens()).toBeTruthy();
      expect(await mockStorage.getUser()).toBeTruthy();
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });

    it('should throw error on failed login', async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ error: 'Invalid credentials' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(authService.login('test@example.com', 'wrong')).rejects.toThrow();
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          requiresVerification: true,
          message: 'Registration successful',
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.register({
        email: 'new@example.com',
        password: 'password',
        name: 'New',
        surname: 'User',
      });

      expect(result.success).toBe(true);
      expect(result.requiresVerification).toBe(true);
    });

    it('should throw error on failed registration', async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ error: 'Email already exists' }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'password',
          name: 'Existing',
          surname: 'User',
        })
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should clear storage on logout', async () => {
      await mockStorage.setTokens({
        idToken: 'token',
        accessToken: 'token',
        expiresAt: Date.now() + 3600000,
      });

      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      await authService.logout();

      expect(await mockStorage.getTokens()).toBeNull();
      expect(await mockStorage.getUser()).toBeNull();
    });

    it('should clear storage even if API call fails', async () => {
      await mockStorage.setTokens({
        idToken: 'token',
        accessToken: 'token',
        expiresAt: Date.now() + 3600000,
      });

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(await mockStorage.getTokens()).toBeNull();
      expect(await mockStorage.getUser()).toBeNull();
    });
  });

  describe('getAuthState', () => {
    it('should return authenticated state with valid tokens', async () => {
      await mockStorage.setTokens({
        idToken: 'token',
        accessToken: 'token',
        expiresAt: Date.now() + 3600000,
      });
      await mockStorage.setUser({
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        surname: 'User',
        role: 'user',
        isActive: true,
      });

      const { user, isAuthenticated } = await authService.getAuthState();

      expect(isAuthenticated).toBe(true);
      expect(user).toBeTruthy();
    });

    it('should refresh expired tokens', async () => {
      await mockStorage.setTokens({
        idToken: 'old-token',
        accessToken: 'old-token',
        expiresAt: Date.now() - 1000, // Expired
      });

      const mockResponse = {
        ok: true,
        json: async () => ({
          idToken: 'new-token',
          accessToken: 'new-token',
          expiresIn: 3600,
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await authService.getAuthState();

      const tokens = await mockStorage.getTokens();
      expect(tokens?.idToken).toBe('new-token');
    });

    it('should return not authenticated if refresh fails', async () => {
      await mockStorage.setTokens({
        idToken: 'old-token',
        accessToken: 'old-token',
        expiresAt: Date.now() - 1000, // Expired
      });

      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      const { user, isAuthenticated } = await authService.getAuthState();

      expect(isAuthenticated).toBe(false);
      expect(user).toBeNull();
    });
  });

  describe('silentRefresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          idToken: 'new-token',
          accessToken: 'new-token',
          expiresIn: 3600,
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.silentRefresh();

      expect(result).toBe(true);
      const tokens = await mockStorage.getTokens();
      expect(tokens?.idToken).toBe('new-token');
    });

    it('should return false on refresh failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      const result = await authService.silentRefresh();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await authService.silentRefresh();

      expect(result).toBe(false);
    });
  });

  describe('getIdToken', () => {
    it('should return valid token', async () => {
      await mockStorage.setTokens({
        idToken: 'valid-token',
        accessToken: 'access-token',
        expiresAt: Date.now() + 3600000,
      });

      const token = await authService.getIdToken();

      expect(token).toBe('valid-token');
    });

    it('should refresh expired token', async () => {
      await mockStorage.setTokens({
        idToken: 'expired-token',
        accessToken: 'expired-access',
        expiresAt: Date.now() - 1000,
      });

      const mockResponse = {
        ok: true,
        json: async () => ({
          idToken: 'new-token',
          accessToken: 'new-access',
          expiresIn: 3600,
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const token = await authService.getIdToken();

      expect(token).toBe('new-token');
    });

    it('should return null if no tokens', async () => {
      const token = await authService.getIdToken();

      expect(token).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user data', async () => {
      await mockStorage.setUser({
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        surname: 'User',
        role: 'user',
        isActive: true,
      });

      await authService.updateUser({ name: 'Updated' });

      const user = await mockStorage.getUser();
      expect(user?.name).toBe('Updated');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        surname: 'User',
        role: 'user' as const,
        isActive: true,
      };

      await mockStorage.setUser(mockUser);

      const user = await authService.getCurrentUser();

      expect(user).toEqual(mockUser);
    });

    it('should return null if no user', async () => {
      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });
  });
});
