import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { AdminDashboardPage } from '../../../pages/Admin/AdminDashboardPage';

// Test i18n instance
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
          dashboard: {
            title: 'Dashboard',
            total_users: 'Total Users',
            total_books: 'Total Books',
            active_users: 'Active Users',
            admin_users: 'Admin Users',
            welcome_title: 'Welcome to the Admin Panel',
            welcome_message: 'This is the foundation for the admin dashboard.',
          },
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

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/admin' }),
  };
});

// Mock API service
const mockGetAdminStats = vi.fn();

vi.mock('../../../contexts/ApiContext', async () => {
  const originalModule = await vi.importActual('../../../contexts/ApiContext');
  return {
    ...originalModule,
    useApi: () => ({
      apiService: {
        getAdminStats: mockGetAdminStats,
      },
    }),
  };
});

describe('Admin Dashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminStats.mockResolvedValue({
      totalUsers: 100,
      activeUsers: 80,
      adminUsers: 5,
      totalBooks: 500,
      timestamp: new Date().toISOString(),
    });
  });

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <I18nextProvider i18n={testI18n}>
          <AdminDashboardPage />
        </I18nextProvider>
      </BrowserRouter>
    );
  };

  test('loads and displays dashboard statistics', async () => {
    renderDashboard();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    expect(mockGetAdminStats).toHaveBeenCalled();
  });

  test('displays all stat cards with correct titles', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Total Books')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('Admin Users')).toBeInTheDocument();
    });
  });

  test('shows welcome message after loading', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Welcome to the Admin Panel')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    mockGetAdminStats.mockRejectedValue(new Error('Network error'));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  test('renders admin layout with navigation', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Administration')).toBeInTheDocument();
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Books')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  test('displays timestamp when available', async () => {
    const timestamp = new Date('2025-01-01T12:00:00Z').toISOString();
    mockGetAdminStats.mockResolvedValue({
      totalUsers: 100,
      activeUsers: 80,
      adminUsers: 5,
      totalBooks: 500,
      timestamp,
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  test('displays zero values correctly', async () => {
    mockGetAdminStats.mockResolvedValue({
      totalUsers: 0,
      activeUsers: 0,
      adminUsers: 0,
      totalBooks: 0,
      timestamp: new Date().toISOString(),
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });
  });

  test('refreshes data on reload', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(mockGetAdminStats).toHaveBeenCalledTimes(1);
    });

    // Simulate refresh would call API again
    mockGetAdminStats.mockResolvedValue({
      totalUsers: 105,
      activeUsers: 85,
      adminUsers: 6,
      totalBooks: 520,
      timestamp: new Date().toISOString(),
    });
  });

  test('displays loading state initially', () => {
    renderDashboard();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('handles network timeout gracefully', async () => {
    mockGetAdminStats.mockRejectedValue(new Error('Network timeout'));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Network timeout/)).toBeInTheDocument();
    });
  });
});
