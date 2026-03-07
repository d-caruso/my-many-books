import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import HowToPage from '../../../pages/HowTo/HowToPage';
import { useAuth } from '@my-many-books/shared-auth';

vi.mock('@my-many-books/shared-auth', () => ({
  useAuth: vi.fn(),
}));

const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['tutorial', 'pages'],
  defaultNS: 'tutorial',
  resources: {
    en: {
      tutorial: {
        page_title: 'How to',
        page_description: 'Quick guides',
        no_guides_available: 'No guides available right now.',
        sections: {
          library_workflows: 'Library workflows',
        },
      },
      pages: {
        protected_route: {
          admin_required_title: 'Access Denied',
          admin_required_message: 'You need administrator privileges to access this page.',
        },
      },
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

const mockUseAuth = vi.mocked(useAuth);

const renderHowToRoute = () =>
  render(
    <I18nextProvider i18n={testI18n}>
      <MemoryRouter initialEntries={['/how-to']}>
        <Routes>
          <Route path="/auth" element={<div>Auth Page</div>} />
          <Route
            path="/how-to"
            element={(
              <ProtectedRoute>
                <HowToPage />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );

describe('How To protected route integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('redirects anonymous users to auth route', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: false,
    } as any);

    renderHowToRoute();

    expect(screen.getByText('Auth Page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'How to' })).not.toBeInTheDocument();
  });

  test('renders How To page for authenticated users', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'reader@example.com',
        name: 'Reader',
        surname: 'User',
        role: 'user',
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: true,
    } as any);

    renderHowToRoute();

    expect(screen.getByRole('heading', { name: 'How to' })).toBeInTheDocument();
    expect(screen.queryByText('Auth Page')).not.toBeInTheDocument();
  });
});
