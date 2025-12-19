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

function createTestJwt(payload: Record<string, unknown>): string {
  const base64UrlEncode = (value: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(value), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const header = base64UrlEncode({ alg: 'none', typ: 'JWT' });
  const body = base64UrlEncode(payload);
  return `${header}.${body}.`;
}

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
      const onAuthStateChange = jest.fn();
      authService = new AuthService({
        storage: mockStorage,
        apiUrl: 'http://localhost:3000/api/v1',
        onAuthStateChange,
      });

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
      expect(onAuthStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      );
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

    it('uses a generic message if the API does not return an error string', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      await expect(authService.login('test@example.com', 'wrong')).rejects.toThrow('Login failed');
    });

    it('re-throws network errors and logs them', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(authService.login('test@example.com', 'password')).rejects.toThrow('Network error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Login error:', expect.any(Error));
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

    it('re-throws network errors and logs them', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'pass',
          name: 'Test',
          surname: 'User',
        })
      ).rejects.toThrow('Network error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Registration error:', expect.any(Error));
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

    it('calls onAuthStateChange with null on logout', async () => {
      const onAuthStateChange = jest.fn();
      authService = new AuthService({
        storage: mockStorage,
        apiUrl: 'http://localhost:3000/api/v1',
        onAuthStateChange,
      });

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

      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      await authService.logout();
      expect(onAuthStateChange).toHaveBeenCalledWith(null);
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

    it('clears storage when tokens exist but user is missing', async () => {
      await mockStorage.setTokens({
        idToken: 'token',
        accessToken: 'token',
        expiresAt: Date.now() + 3600000,
      });

      const { user, isAuthenticated } = await authService.getAuthState();
      expect(isAuthenticated).toBe(false);
      expect(user).toBeNull();
      expect(await mockStorage.getTokens()).toBeNull();
    });

    it('should refresh expired tokens', async () => {
      await mockStorage.setTokens({
        idToken: 'old-token',
        accessToken: 'old-token',
        expiresAt: Date.now() - 1000, // Expired
      });

      const idToken = createTestJwt({
        sub: 1,
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
      });

      const mockResponse = {
        ok: true,
        json: async () => ({
          idToken,
          accessToken: 'new-token',
          expiresIn: 3600,
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const { user, isAuthenticated } = await authService.getAuthState();

      const tokens = await mockStorage.getTokens();
      expect(tokens?.idToken).toBe(idToken);
      expect(isAuthenticated).toBe(true);
      expect(user?.email).toBe('test@example.com');
    });

    it('clears storage when refresh succeeds but user cannot be restored', async () => {
      class NoUserStorageAdapter extends MockStorageAdapter {
        async setUser(): Promise<void> {}
      }

      const storage = new NoUserStorageAdapter();
      authService = new AuthService({
        storage,
        apiUrl: 'http://localhost:3000/api/v1',
      });

      await storage.setTokens({
        idToken: 'old-token',
        accessToken: 'old-token',
        expiresAt: Date.now() - 1000,
      });

      const idToken = createTestJwt({
        sub: 1,
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          idToken,
          accessToken: 'new-token',
          expiresIn: 3600,
        }),
      });

      const { user, isAuthenticated } = await authService.getAuthState();
      expect(isAuthenticated).toBe(false);
      expect(user).toBeNull();
      expect(await storage.getTokens()).toBeNull();
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

    it('returns not authenticated when storage access throws', async () => {
      const storage = {
        getTokens: jest.fn(async () => {
          throw new Error('boom');
        }),
        getUser: jest.fn(async () => null),
        setTokens: jest.fn(async () => {}),
        removeTokens: jest.fn(async () => {}),
        setUser: jest.fn(async () => {}),
        removeUser: jest.fn(async () => {}),
        clear: jest.fn(async () => {}),
      };

      authService = new AuthService({
        storage: storage as any,
        apiUrl: 'http://localhost:3000/api/v1',
      });

      const result = await authService.getAuthState();
      expect(result).toEqual({ user: null, isAuthenticated: false });
      expect(storage.clear).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Auth state check failed:', expect.any(Error));
    });
  });

  describe('silentRefresh', () => {
    it('should refresh tokens successfully', async () => {
      const onTokenRefresh = jest.fn();
      authService = new AuthService({
        storage: mockStorage,
        apiUrl: 'http://localhost:3000/api/v1',
        onTokenRefresh,
      });

      const idToken = createTestJwt({
        sub: 1,
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
      });

      const mockResponse = {
        ok: true,
        json: async () => ({
          idToken,
          accessToken: 'new-token',
          expiresIn: 3600,
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.silentRefresh();

      expect(result).toBe(true);
      const tokens = await mockStorage.getTokens();
      expect(tokens?.idToken).toBe(idToken);
      expect(onTokenRefresh).toHaveBeenCalledWith(expect.objectContaining({ idToken }));
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

    it('returns false if the ID token cannot be decoded', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          idToken: 'not-a-jwt',
          accessToken: 'new-token',
          expiresIn: 3600,
        }),
      });

      const result = await authService.silentRefresh();
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to decode ID token:', expect.any(Error));
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

      const idToken = createTestJwt({
        sub: 1,
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
      });

      const mockResponse = {
        ok: true,
        json: async () => ({
          idToken,
          accessToken: 'new-access',
          expiresIn: 3600,
        }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const token = await authService.getIdToken();

      expect(token).toBe(idToken);
    });

    it('should return null if no tokens', async () => {
      const token = await authService.getIdToken();

      expect(token).toBeNull();
    });

    it('returns null if refresh fails', async () => {
      await mockStorage.setTokens({
        idToken: 'expired-token',
        accessToken: 'expired-access',
        expiresAt: Date.now() - 1000,
      });

      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
      await expect(authService.getIdToken()).resolves.toBeNull();
    });
  });

  describe('getAccessToken', () => {
    it('returns null if there are no tokens', async () => {
      await expect(authService.getAccessToken()).resolves.toBeNull();
    });

    it('should return valid access token', async () => {
      await mockStorage.setTokens({
        idToken: 'valid-token',
        accessToken: 'access-token',
        expiresAt: Date.now() + 3600000,
      });

      const token = await authService.getAccessToken();
      expect(token).toBe('access-token');
    });

    it('should refresh expired access token', async () => {
      await mockStorage.setTokens({
        idToken: 'expired-token',
        accessToken: 'expired-access',
        expiresAt: Date.now() - 1000,
      });

      const idToken = createTestJwt({
        sub: 1,
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          idToken,
          accessToken: 'new-access',
          expiresIn: 3600,
        }),
      });

      const token = await authService.getAccessToken();
      expect(token).toBe('new-access');
    });

    it('returns null if refresh fails', async () => {
      await mockStorage.setTokens({
        idToken: 'expired-token',
        accessToken: 'expired-access',
        expiresAt: Date.now() - 1000,
      });

      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      const token = await authService.getAccessToken();
      expect(token).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user data', async () => {
      const onAuthStateChange = jest.fn();
      authService = new AuthService({
        storage: mockStorage,
        apiUrl: 'http://localhost:3000/api/v1',
        onAuthStateChange,
      });

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
      expect(onAuthStateChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated' }));
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
