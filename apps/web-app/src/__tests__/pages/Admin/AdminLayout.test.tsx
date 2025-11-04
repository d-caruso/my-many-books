import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { AdminLayout } from '../../../pages/Admin/AdminLayout';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/admin' }),
  };
});

// Create test i18n instance
const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['pages'],
  defaultNS: 'pages',
  resources: {
    en: {
      pages: {
        admin: {
          title: 'Admin Panel',
          sidebar_title: 'Administration',
          back_to_app: 'Back to application',
          menu: {
            dashboard: 'Dashboard',
            users: 'Users',
            books: 'Books',
            settings: 'Settings',
          },
        },
      },
    },
  },
});

const renderWithProvider = (ui: React.ReactElement) => {
  return rtlRender(
    <BrowserRouter>
      <I18nextProvider i18n={testI18n}>
        {ui}
      </I18nextProvider>
    </BrowserRouter>
  );
};

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders admin panel title', () => {
    renderWithProvider(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  test('renders sidebar with administration title', () => {
    renderWithProvider(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  test('renders all menu items', () => {
    renderWithProvider(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('renders children content', () => {
    renderWithProvider(
      <AdminLayout>
        <div data-testid="test-content">Test Content</div>
      </AdminLayout>
    );
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  test('navigates back to main app when back button is clicked', () => {
    renderWithProvider(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    const backButton = screen.getByLabelText('Back to application');
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('navigates to dashboard when dashboard menu item is clicked', () => {
    renderWithProvider(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    const dashboardButton = screen.getByText('Dashboard');
    fireEvent.click(dashboardButton);

    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  test('navigates to users page when users menu item is clicked', () => {
    renderWithProvider(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    const usersButton = screen.getByText('Users');
    fireEvent.click(usersButton);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
  });

  test('navigates to books page when books menu item is clicked', () => {
    renderWithProvider(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    const booksButton = screen.getByText('Books');
    fireEvent.click(booksButton);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/books');
  });

  test('navigates to settings page when settings menu item is clicked', () => {
    renderWithProvider(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>
    );

    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/settings');
  });
});
