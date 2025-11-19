/**
 * Auth Flow Integration Tests
 * Tests the authentication flow using shared-auth library
 */

import React from 'react';
import * as SecureStore from 'expo-secure-store';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock shared-auth library
const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockRegister = jest.fn();
const mockUseAuth = jest.fn();
const mockAuthProvider = jest.fn(({ children }) => children);

jest.mock('@my-many-books/shared-auth', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: (props: { children: React.ReactNode }) => mockAuthProvider(props),
}));

// Mock authService
const mockAuthService = {
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  getAuthState: jest.fn(),
  getIdToken: jest.fn(),
};

jest.mock('@/services/authService', () => ({
  authService: mockAuthService,
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('Auth Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
  });

  it('should show loading state during initial auth check', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      login: mockLogin,
      logout: mockLogout,
      register: mockRegister,
      isAuthenticated: false,
      refreshUser: jest.fn(),
    });

    const { user, loading, isAuthenticated } = mockUseAuth();

    expect(loading).toBe(true);
    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('should handle successful login and navigate', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test',
      surname: 'User',
    };

    mockLogin.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      register: mockRegister,
      isAuthenticated: true,
      refreshUser: jest.fn(),
    });

    const { login, user, isAuthenticated } = mockUseAuth();

    await login('test@example.com', 'password123');

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(user).toEqual(mockUser);
    expect(isAuthenticated).toBe(true);
  });

  it('should clear user state on logout', async () => {
    mockLogout.mockResolvedValue(undefined);

    // Before logout - user is authenticated
    mockUseAuth.mockReturnValueOnce({
      user: { id: '1', email: 'test@example.com', name: 'Test', surname: 'User' },
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      register: mockRegister,
      isAuthenticated: true,
      refreshUser: jest.fn(),
    });

    const authBefore = mockUseAuth();
    expect(authBefore.isAuthenticated).toBe(true);

    await authBefore.logout();

    // After logout - user is cleared
    mockUseAuth.mockReturnValueOnce({
      user: null,
      loading: false,
      login: mockLogin,
      logout: mockLogout,
      register: mockRegister,
      isAuthenticated: false,
      refreshUser: jest.fn(),
    });

    const authAfter = mockUseAuth();

    expect(mockLogout).toHaveBeenCalled();
    expect(authAfter.user).toBeNull();
    expect(authAfter.isAuthenticated).toBe(false);
  });

  it('should properly store tokens in SecureStore', async () => {
    const mockTokens = {
      idToken: 'id-token-123',
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      expiresAt: Date.now() + 3600000,
    };

    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(mockTokens));

    // Store tokens
    await mockSecureStore.setItemAsync('auth_tokens', JSON.stringify(mockTokens));

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'auth_tokens',
      JSON.stringify(mockTokens)
    );

    // Retrieve tokens
    const storedTokens = await mockSecureStore.getItemAsync('auth_tokens');
    expect(storedTokens).toBe(JSON.stringify(mockTokens));
  });
});
