// @ts-nocheck
/**
 * LanguageSelector Component Tests
 *
 * Note: Full integration tests with react-native-paper Menu component
 * are challenging in the current test environment due to mocking limitations.
 * These tests verify the component can be imported and instantiated correctly.
 * Visual and interaction testing should be done manually or with E2E tests.
 */
import React from 'react';
import LanguageSelector from '../../src/components/LanguageSelector';

// Mock process.env for environment variables
jest.mock('process', () => ({
  env: {
    ...jest.requireActual('process').env,
    EXPO_PUBLIC_SHOW_LANGUAGE_SELECTOR: 'true',
  },
}));

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  }),
}));

// Mock shared-i18n
jest.mock('@my-many-books/shared-i18n', () => ({
  SUPPORTED_LANGUAGES: [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  ],
}));

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#2196F3',
        surfaceVariant: '#E3F2FD',
      },
    },
    isDark: false,
    themeMode: 'light',
    setThemeMode: jest.fn(),
  }),
}));

describe('LanguageSelector', () => {
  it('is exported as a function component', () => {
    expect(LanguageSelector).toBeDefined();
    expect(typeof LanguageSelector).toBe('function');
  });

  it('has the expected function signature', () => {
    // Function components should accept at least one parameter (props)
    expect(LanguageSelector.length).toBeGreaterThanOrEqual(1);
  });

  it('component name is LanguageSelector', () => {
    expect(LanguageSelector.name).toBe('LanguageSelector');
  });
});
