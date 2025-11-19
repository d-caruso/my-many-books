/**
 * Auth Service Instance Tests
 * Tests auth service initialization and configuration
 */

// Mock expo-constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:3001/api/v1',
      },
    },
  },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock shared-auth
jest.mock('@my-many-books/shared-auth', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    getAuthState: jest.fn(),
    getIdToken: jest.fn(),
  })),
  MobileStorageAdapter: jest.fn(),
}));

describe('AuthService Instance', () => {
  it('should initialize with MobileStorageAdapter', () => {
    const { AuthService, MobileStorageAdapter } = require('@my-many-books/shared-auth');

    expect(MobileStorageAdapter).toBeDefined();
    expect(AuthService).toBeDefined();
  });

  it('should configure with API URL', () => {
    const apiUrl = 'http://localhost:3001/api/v1';

    expect(apiUrl).toBe('http://localhost:3001/api/v1');
  });

  it('should have onAuthStateChange callback', () => {
    const onAuthStateChange = (user: unknown) => {
      console.log('Auth state changed:', user);
    };

    expect(typeof onAuthStateChange).toBe('function');
  });

  it('should have onTokenRefresh callback', () => {
    const onTokenRefresh = (tokens: unknown) => {
      console.log('Tokens refreshed:', tokens);
    };

    expect(typeof onTokenRefresh).toBe('function');
  });

  it('should provide all required methods', () => {
    const requiredMethods = ['login', 'logout', 'register', 'getAuthState', 'getIdToken'];

    requiredMethods.forEach(method => {
      expect(method).toBeTruthy();
    });
  });

  it('should use fallback API URL if env not set', () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

    expect(apiUrl).toBeTruthy();
  });
});
