
import React from 'react';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { UserManagementPage } from '../../../pages/Admin/UserManagementPage';
import { ApiProvider } from '../../../contexts/ApiContext';

// Mock dependencies
const mockApiService = {
  getAdminUsers: vi.fn(),
  updateAdminUser: vi.fn(),
  deleteAdminUser: vi.fn(),
};

vi.mock('../../../contexts/ApiContext', async () => {
  const originalModule = await vi.importActual('../../../contexts/ApiContext');
  const useApi = () => ({ apiService: mockApiService });
  return {
    ...originalModule,
    useApi,
  };
});

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
}));

vi.mock('@mui/x-data-grid', () => ({
  DataGrid: (props: any) => {
    return (
      <div data-testid="data-grid">
        {props.rows.map((row: any) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            {props.columns.map((col: any) => (
              <div key={col.field}>{col.field}</div>
            ))}
          </div>
        ))}
      </div>
    );
  },
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
          users: {
            title: 'User Management',
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

describe('UserManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders user management title', () => {
    mockApiService.getAdminUsers.mockResolvedValue({ users: [], pagination: { total: 0 } });
    renderWithProvider(<UserManagementPage />);
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  test('fetches and displays users', async () => {
    const users = [
      { id: 1, fullName: 'John Doe', email: 'john@example.com', role: 'user', isActive: true, createdAt: new Date().toISOString() },
      { id: 2, fullName: 'Jane Doe', email: 'jane@example.com', role: 'admin', isActive: false, createdAt: new Date().toISOString() },
    ];
    mockApiService.getAdminUsers.mockResolvedValue({ users, pagination: { total: 2 } });
    renderWithProvider(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId('row-1')).toBeInTheDocument();
    });
    expect(screen.getByTestId('row-2')).toBeInTheDocument();
  });
});
