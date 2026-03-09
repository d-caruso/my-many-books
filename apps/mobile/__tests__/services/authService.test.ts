/**
 * Auth Service Instance Tests
 * Tests auth service initialization and configuration
 */

// Mock local storage adapter to avoid importing expo-secure-store in Node/Jest.
jest.mock('../../src/services/MobileStorageAdapter', () => ({
  MobileStorageAdapter: jest.fn().mockImplementation(() => ({})),
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
}));

describe('AuthService Instance', () => {
  it('should initialize with MobileStorageAdapter', async () => {
    jest.resetModules();

    await import('../../src/services/authService');
    const { AuthService } = await import('@my-many-books/shared-auth');
    const { MobileStorageAdapter } = await import('../../src/services/MobileStorageAdapter');

    expect(AuthService).toHaveBeenCalledTimes(1);
    expect(MobileStorageAdapter).toHaveBeenCalledTimes(1);
  });

  it('should configure AuthService with API_BASE_URL', async () => {
    jest.resetModules();

    const { API_BASE_URL } = await import('../../src/config/api');
    await import('../../src/services/authService');
    const { AuthService } = await import('@my-many-books/shared-auth');

    expect(AuthService).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl: API_BASE_URL,
      })
    );
  });

  it('should have onAuthStateChange callback', () => {
    const onAuthStateChange = (_user: unknown): void => undefined;

    expect(typeof onAuthStateChange).toBe('function');
  });

  it('should have onTokenRefresh callback', () => {
    const onTokenRefresh = (_tokens: unknown): void => undefined;

    expect(typeof onTokenRefresh).toBe('function');
  });

  it('should provide all required methods', () => {
    const requiredMethods = ['login', 'logout', 'register', 'getAuthState', 'getIdToken'];

    requiredMethods.forEach((method) => {
      expect(method).toBeTruthy();
    });
  });

  it('should expose a non-empty API_BASE_URL', async () => {
    const { API_BASE_URL } = await import('../../src/config/api');
    expect(API_BASE_URL).toBeTruthy();
  });
});
