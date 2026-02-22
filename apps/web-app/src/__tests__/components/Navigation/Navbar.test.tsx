import React from 'react';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, test, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Navbar } from '../../../components/Navigation/Navbar';
import { useAuth } from '@my-many-books/shared-auth';

vi.mock('@my-many-books/shared-auth', () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/books' }),
}));

vi.mock('@mui/icons-material/Menu', () => ({
  default: () => <span data-testid="menu-icon">☰</span>,
}));

vi.mock('@mui/icons-material/MoreVert', () => ({
  default: () => <span data-testid="more-vert-icon">⋮</span>,
}));

const mockUseAuth = vi.mocked(useAuth);

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
        about: 'About',
        menu: 'Menu',
        user_menu: 'User menu',
        user_avatar: 'User avatar',
        about_app_title: 'What this app is for',
        about_app_body: '<bold>My Many Books</bold> helps you organize your personal library, track reading status, search books, and manage your collection.',
        dont_show_again: "Don't show again",
        ok: 'OK',
      },
      books: {
        my_books: 'My Books',
      },
    },
  },
  interpolation: { escapeValue: false },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nextProvider i18n={testI18n}>
    <BrowserRouter>{children}</BrowserRouter>
  </I18nextProvider>
);

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: TestWrapper });

const baseUser = {
  userId: 1,
  email: 'test@example.com',
  name: 'Test',
  surname: 'User',
};

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders navbar with logo and app name', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'My Many Books logo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /My Many Books/ })).toBeInTheDocument();
  });

  test('shows mobile menu icon when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />);

    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('User avatar')).not.toBeInTheDocument();
  });

  test('shows user menu when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: baseUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />);

    expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
    expect(screen.getByLabelText('User avatar')).toBeInTheDocument();
  });

  test('opens and closes menu via the user button', async () => {
    mockUseAuth.mockReturnValue({
      user: baseUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />);

    fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'My Books' }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  test('handles logout correctly', async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: baseUser,
      loading: false,
      login: vi.fn(),
      logout: mockLogout,
      signup: vi.fn(),
    });

    render(<Navbar />);

    fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
  });

  test('opens about dialog from the user menu', async () => {
    mockUseAuth.mockReturnValue({
      user: baseUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />);

    fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'About' }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText('What this app is for')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('clicking logo navigates to home page', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />);

    fireEvent.click(screen.getByRole('button', { name: /My Many Books/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('navigation buttons navigate to correct paths', () => {
    mockUseAuth.mockReturnValue({
      user: baseUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />);

    fireEvent.click(screen.getByRole('button', { name: 'My Books' }));
    expect(mockNavigate).toHaveBeenCalledWith('/');

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(mockNavigate).toHaveBeenCalledWith('/search');

    fireEvent.click(screen.getByRole('button', { name: 'Scanner' }));
    expect(mockNavigate).toHaveBeenCalledWith('/scanner');
  });

  test('shows user avatar initial when name is available', () => {
    mockUseAuth.mockReturnValue({
      user: { ...baseUser, name: 'John' },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />);

    expect(screen.getByLabelText('User avatar')).toHaveTextContent('J');
  });

  test('falls back to email initial when name is missing', () => {
    mockUseAuth.mockReturnValue({
      user: { userId: 2, email: 'fallback@example.com', name: undefined, surname: undefined },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />);

    expect(screen.getByLabelText('User avatar')).toHaveTextContent('F');
  });

  test('renders while authentication state is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(<Navbar />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /My Many Books/ })).toBeInTheDocument();
  });
});
