import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Navbar } from '../../components/Navigation/Navbar';
import { expectNoA11yViolations } from '../utils/axe-helper';
import { setupMuiMock } from '../test-utils/setupMuiMock';
import { useAuth } from '@my-many-books/shared-auth';

// Mock the useAuth hook
vi.mock('@my-many-books/shared-auth', () => ({
  useAuth: vi.fn(),
}));

// Mock React Router hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/books' }),
}));

setupMuiMock();

vi.mock('@mui/icons-material', () => ({
  MenuBook: () => <span data-testid="menu-book-icon" aria-hidden="true">📚</span>,
  Menu: () => <span data-testid="menu-icon" aria-hidden="true">☰</span>,
  ExpandMore: () => <span data-testid="expand-more-icon" aria-hidden="true">▼</span>,
  Language: () => <span data-testid="language-icon" aria-hidden="true">🌐</span>,
}));

// Create test i18n instance
const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['common', 'books'],
  defaultNS: 'common',
  resources: {
    en: {
      common: {
        app_name: 'My Many Books',
        search: 'Search',
        scanner: 'Scanner',
        sign_out: 'Sign out',
      },
      books: {
        my_books: 'My Books',
      },
      accessibility: {
        user_avatar: 'User avatar',
        select_language: 'Select language',
      },
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

const baseAuthMock = (): ReturnType<typeof useAuth> => ({
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  verifyEmail: vi.fn(),
  resendCode: vi.fn(),
  changePassword: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  refreshUser: vi.fn(),
  user: null,
  loading: false,
  isAuthenticated: false,
});

describe('Navbar Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not have any accessibility violations when user is not authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue(baseAuthMock());

    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </I18nextProvider>
    );

    await expectNoA11yViolations(container);
  });

  it('should not have accessibility violations when user is authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuthMock(),
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        surname: 'User',
        role: 'user',
        isActive: true,
      },
      isAuthenticated: true,
    });

    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </I18nextProvider>
    );

    await expectNoA11yViolations(container);
  });

  it('should not have accessibility violations when user is admin', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuthMock(),
      user: {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin',
        surname: 'User',
        role: 'admin',
        isActive: true,
      },
      isAuthenticated: true,
    });

    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </I18nextProvider>
    );

    await expectNoA11yViolations(container);
  });
});
