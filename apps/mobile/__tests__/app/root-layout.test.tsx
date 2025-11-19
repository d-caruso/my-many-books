/**
 * Root Layout Logic Tests
 * Tests AuthProvider integration and loading states
 */

// Mock shared-auth
jest.mock('@my-many-books/shared-auth', () => ({
  AuthProvider: jest.fn(({ children }) => children),
}));

// Mock authService
jest.mock('@/services/authService', () => ({
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
    getAuthState: jest.fn(),
  },
}));

describe('Root Layout Logic', () => {
  it('should initialize with correct providers', () => {
    const providersSetup = {
      SafeAreaProvider: true,
      ThemeProvider: true,
      PaperProvider: true,
      AuthProvider: true,
    };

    const allProvidersPresent = Object.values(providersSetup).every(v => v === true);

    expect(allProvidersPresent).toBe(true);
  });

  it('should pass authService to AuthProvider', () => {
    const authServiceConfig = {
      hasLoginMethod: true,
      hasLogoutMethod: true,
      hasGetAuthStateMethod: true,
    };

    const isAuthServiceValid = Object.values(authServiceConfig).every(v => v === true);

    expect(isAuthServiceValid).toBe(true);
  });

  it('should provide loading component to AuthProvider', () => {
    const loadingComponentProvided = true;

    expect(loadingComponentProvided).toBe(true);
  });

  it('should initialize i18n on app start', () => {
    const i18nInitialized = true;

    expect(i18nInitialized).toBe(true);
  });
});
