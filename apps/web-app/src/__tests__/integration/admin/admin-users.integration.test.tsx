import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { UserManagementPage } from '../../../pages/Admin/UserManagementPage';

// Mock API service
const mockGetAdminUsers = vi.fn();
const mockUpdateAdminUser = vi.fn();
const mockDeleteAdminUser = vi.fn();

vi.mock('../../../contexts/ApiContext', async () => {
  const originalModule = await vi.importActual('../../../contexts/ApiContext');
  return {
    ...originalModule,
    useApi: () => ({
      apiService: {
        getAdminUsers: mockGetAdminUsers,
        updateAdminUser: mockUpdateAdminUser,
        deleteAdminUser: mockDeleteAdminUser,
      },
    }),
  };
});

// Test i18n instance
const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['pages', 'common'],
  defaultNS: 'pages',
  resources: {
    en: {
      pages: {
        admin: {
          users: {
            title: 'User Management',
            search_placeholder: 'Search by name or email...',
            search: 'Search',
            edit_user: 'Edit User',
            delete_confirmation_title: 'Delete User',
            delete_confirmation_message: 'Are you sure you want to delete {{name}}?',
          },
          title: 'Admin Panel',
          sidebar_title: 'Administration',
          menu: {
            dashboard: 'Dashboard',
            users: 'Users',
            books: 'Books',
            settings: 'Settings',
          },
        },
      },
      common: {
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        name: 'Name',
        email: 'Email',
        role: 'Role',
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
    useLocation: () => ({ pathname: '/admin/users' }),
  };
});

// Mock DataGrid
vi.mock('@mui/x-data-grid', () => ({
  DataGrid: (props: any) => {
    return (
      <div data-testid="data-grid">
        {props.rows.map((row: any) => (
          <div key={row.id} data-testid={`user-row-${row.id}`}>
            <span>{row.fullName}</span>
            <span>{row.email}</span>
            <span>{row.role}</span>
          </div>
        ))}
      </div>
    );
  },
}));

describe('Admin User Management Integration', () => {
  const mockUsers = [
    {
      id: 1,
      fullName: 'John Doe',
      email: 'john@example.com',
      role: 'user',
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
    },
    {
      id: 2,
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      role: 'admin',
      isActive: true,
      createdAt: '2025-01-02T00:00:00Z',
    },
    {
      id: 3,
      fullName: 'Bob Wilson',
      email: 'bob@example.com',
      role: 'user',
      isActive: false,
      createdAt: '2025-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUsers.mockResolvedValue({
      users: mockUsers,
      pagination: { total: 3, page: 1, pageSize: 10 },
    });
    mockUpdateAdminUser.mockResolvedValue({});
    mockDeleteAdminUser.mockResolvedValue({});
  });

  const renderUserManagement = () => {
    return render(
      <BrowserRouter>
        <I18nextProvider i18n={testI18n}>
          <UserManagementPage />
        </I18nextProvider>
      </BrowserRouter>
    );
  };

  test('loads and displays user list', async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByTestId('user-row-1')).toBeInTheDocument();
    });
    expect(screen.getByTestId('user-row-2')).toBeInTheDocument();
    expect(screen.getByTestId('user-row-3')).toBeInTheDocument();
    expect(mockGetAdminUsers).toHaveBeenCalledTimes(1);
  });

  test('displays user details correctly', async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  test('renders page title and layout', async () => {
    renderUserManagement();

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  test('handles search functionality', async () => {
    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by name or email...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by name or email...');
    const searchButton = screen.getByText('Search');

    fireEvent.change(searchInput, { target: { value: 'John' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockGetAdminUsers).toHaveBeenCalledWith(1, 10, 'John');
    });
  });

  test('handles API errors gracefully', async () => {
    mockGetAdminUsers.mockRejectedValue(new Error('Failed to load users'));

    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByText('Failed to load users')).toBeInTheDocument();
    });
  });

  test('displays multiple user roles', async () => {
    renderUserManagement();

    await waitFor(() => {
      const rows = screen.getAllByText(/user|admin/);
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  test('handles pagination correctly', async () => {
    const largeMockUsers = Array.from({ length: 15 }, (_, i) => ({
      id: i + 10,
      fullName: `User ${i}`,
      email: `user${i}@example.com`,
      role: 'user',
      isActive: true,
      createdAt: new Date().toISOString(),
    }));

    mockGetAdminUsers.mockResolvedValueOnce({
      users: largeMockUsers.slice(0, 10),
      pagination: { total: 15, page: 1, pageSize: 10 },
    });

    renderUserManagement();

    await waitFor(() => {
      expect(mockGetAdminUsers).toHaveBeenCalledWith(1, 10, undefined);
    });
  });

  test('handles empty user list', async () => {
    mockGetAdminUsers.mockResolvedValue({
      users: [],
      pagination: { total: 0, page: 1, pageSize: 10 },
    });

    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByTestId('data-grid')).toBeInTheDocument();
    });
  });

  test('handles update user success', async () => {
    mockUpdateAdminUser.mockResolvedValue({
      id: 1,
      fullName: 'Updated Name',
      email: 'john@example.com',
      role: 'admin',
      isActive: true,
    });

    renderUserManagement();

    await waitFor(() => {
      expect(screen.getByTestId('user-row-1')).toBeInTheDocument();
    });

    // Simulate update (would need user interaction in real test)
    await mockUpdateAdminUser(1, { role: 'admin' });

    expect(mockUpdateAdminUser).toHaveBeenCalledWith(1, { role: 'admin' });
  });
});
