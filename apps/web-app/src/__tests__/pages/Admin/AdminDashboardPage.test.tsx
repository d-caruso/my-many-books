
import React from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { AdminDashboardPage } from '../../../pages/Admin/AdminDashboardPage';
import { ApiProvider } from '../../../contexts/ApiContext';

// Mock dependencies
const mockGetAdminStats = vi.fn();

vi.mock('../../../contexts/ApiContext', async () => {
  const originalModule = await vi.importActual('../../../contexts/ApiContext');
  const useApi = () => ({
    apiService: {
      getAdminStats: mockGetAdminStats,
    },
  });
  return {
    ...originalModule,
    useApi,
  };
});

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
}));

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
          dashboard: {
            title: 'Dashboard',
            total_users: 'Total Users',
            total_books: 'Total Books',
            active_users: 'Active Users',
            admin_users: 'Admin Users',
            welcome_title: 'Welcome to the Admin Panel',
            welcome_message: 'This is the foundation for the admin dashboard. Use the sidebar to navigate to different admin sections.',
          },
        },
      },
    },
  },
});

const renderWithProvider = (ui: React.ReactElement) => {
  return rtlRender(
    <I18nextProvider i18n={testI18n}>
      <ApiProvider>
        {ui}
      </ApiProvider>
    </I18nextProvider>
  );
};

describe('AdminDashboardPage', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders dashboard title', () => {
    mockGetAdminStats.mockResolvedValue({ totalUsers: 0, activeUsers: 0, adminUsers: 0, totalBooks: 0 });
    renderWithProvider(<AdminDashboardPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('displays loading indicator while fetching stats', () => {
    mockGetAdminStats.mockReturnValue(new Promise(() => {})); // Never resolves
    renderWithProvider(<AdminDashboardPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('displays error message if stats fetching fails', async () => {
    const errorMessage = 'Failed to load stats';
    mockGetAdminStats.mockRejectedValue(new Error(errorMessage));
    renderWithProvider(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  test('displays stat cards with correct data after successful fetch', async () => {
    const stats = { totalUsers: 10, activeUsers: 8, adminUsers: 2, totalBooks: 100 };
    mockGetAdminStats.mockResolvedValue(stats);
    renderWithProvider(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();

      expect(screen.getByText('Total Books')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();

      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();

      expect(screen.getByText('Admin Users')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});
