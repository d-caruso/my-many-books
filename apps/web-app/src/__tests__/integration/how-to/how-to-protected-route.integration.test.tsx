import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import HowToPage from '../../../pages/HowTo/HowToPage';
import { useAuth } from '@my-many-books/shared-auth';
import * as howToContent from '../../../pages/HowTo/howToContent';

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
        cta_try_it_now: 'Try it now',
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
type AuthContextValue = ReturnType<typeof useAuth>;

const createAuthContextValue = (overrides: Partial<AuthContextValue> = {}): AuthContextValue => ({
  user: null,
  loading: false,
  login: vi.fn(),
  register: vi.fn(),
  verifyEmail: vi.fn(),
  resendCode: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  isAuthenticated: false,
  ...overrides,
});

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location-display">{`${location.pathname}${location.search}`}</div>;
};

const getAuthenticatedUser = () => ({
  user: {
    id: 1,
    email: 'reader@example.com',
    name: 'Reader',
    surname: 'User',
    role: 'user',
    isActive: true,
  },
  isAuthenticated: true,
});

const renderHowToRoute = (initialEntries: string[] = ['/how-to']) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/auth" element={<div>Auth Page</div>} />
          <Route path="/" element={<LocationDisplay />} />
          <Route path="/scanner" element={<LocationDisplay />} />
          <Route path="/account" element={<LocationDisplay />} />
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
    mockUseAuth.mockReturnValue(createAuthContextValue());

    renderHowToRoute();

    expect(screen.getByText('Auth Page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'How to' })).not.toBeInTheDocument();
  });

  test('renders How To page for authenticated users', () => {
    mockUseAuth.mockReturnValue(createAuthContextValue(getAuthenticatedUser()));

    renderHowToRoute();

    expect(screen.getByRole('heading', { name: 'How to' })).toBeInTheDocument();
    expect(screen.queryByText('Auth Page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('how-to-card-change-password')).not.toBeInTheDocument();
    expect(screen.queryByTestId('how-to-cta-change-password')).not.toBeInTheDocument();
  });

  test.each([
    { ctaTestId: 'how-to-cta-add-book', expectedLocation: '/?mode=add' },
    { ctaTestId: 'how-to-cta-modify-book', expectedLocation: '/' },
    { ctaTestId: 'how-to-cta-delete-book', expectedLocation: '/' },
    { ctaTestId: 'how-to-cta-scanner', expectedLocation: '/scanner' },
    { ctaTestId: 'how-to-cta-assign-authors-categories', expectedLocation: '/?mode=add' },
    { ctaTestId: 'how-to-cta-add-authors-categories', expectedLocation: '/?mode=add' },
    { ctaTestId: 'how-to-cta-modify-delete-authors-categories', expectedLocation: '/?mode=add' },
  ])('navigates using %s to expected route', ({ ctaTestId, expectedLocation }) => {
    mockUseAuth.mockReturnValue(createAuthContextValue(getAuthenticatedUser()));

    renderHowToRoute();
    fireEvent.click(screen.getByTestId(ctaTestId));

    expect(screen.getByTestId('location-display')).toHaveTextContent(expectedLocation);
  });

  test('renders change password card and CTA when password feature is enabled', () => {
    const featureSpy = vi
      .spyOn(howToContent, 'getTutorialCapabilities')
      .mockReturnValue({ userPasswordFeature: true });

    mockUseAuth.mockReturnValue(createAuthContextValue(getAuthenticatedUser()));

    renderHowToRoute();

    expect(screen.getByTestId('how-to-card-change-password')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('how-to-cta-change-password'));
    expect(screen.getByTestId('location-display')).toHaveTextContent('/account');

    featureSpy.mockRestore();
  });
});
