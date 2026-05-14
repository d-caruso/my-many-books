import React from 'react';
import { act } from 'react-test-renderer';
import renderer from 'react-test-renderer';
import { Linking } from 'react-native';
import { LEGAL_URLS } from '@/constants/legalUrls';
import ProfileScreen from '../../app/(tabs)/profile';

jest.mock('@my-many-books/shared-auth', () => ({
  useAuth: () => ({ user: null, logout: jest.fn() }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, setThemeMode: jest.fn() }),
}));

jest.mock('@/i18n', () => ({
  changeLanguage: jest.fn(),
}));

jest.mock('@/components/LanguageSelector', () => () => null);
jest.mock('@/components/About/AboutDialog', () => ({ AboutDialog: () => null }));
jest.mock('@/components/PageErrorBoundary', () => ({
  PageErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

function renderAndPressAll() {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<ProfileScreen />);
  });
  const pressables = tree!.root.findAll((node) => typeof node.props.onPress === 'function');
  act(() => {
    pressables.forEach((node) => {
      try { node.props.onPress(); } catch { /* ignore unrelated handlers */ }
    });
  });
  return tree!;
}

describe('Profile — legal links', () => {
  it('opens the hosted privacy policy URL', () => {
    renderAndPressAll();
    expect(Linking.openURL).toHaveBeenCalledWith(LEGAL_URLS.privacyPolicy);
  });

  it('opens the hosted terms of service URL', () => {
    renderAndPressAll();
    expect(Linking.openURL).toHaveBeenCalledWith(LEGAL_URLS.termsOfService);
  });
});
