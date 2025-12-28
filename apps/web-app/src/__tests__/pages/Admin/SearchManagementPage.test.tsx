import React from 'react';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { SearchManagementPage } from '../../../pages/Admin/SearchManagementPage';
import { ApiProvider } from '../../../contexts/ApiContext';

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
}));

const mockApiService = {
  get: vi.fn().mockResolvedValue({ data: { results: [], total: 0 } }),
  post: vi.fn().mockResolvedValue({}),
  patch: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
  baseURL: 'http://localhost:3000',
} as any;

// Create test i18n instance
const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        search: {
          pinned: {
            title: 'Search Management',
            resource_type: 'Resource Type',
            all: 'All',
            resource_book: 'Books',
            resource_author: 'Authors',
            resource_category: 'Categories',
            empty: 'No pinned results yet',
            unpin: 'Unpin',
            priority_badge: 'Priority {{priority}}',
            active: 'Active',
            inactive: 'Inactive',
          },
        },
      },
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

const renderWithProvider = (component: React.ReactElement) => {
  return rtlRender(
    <I18nextProvider i18n={testI18n}>
      <ApiProvider apiService={mockApiService}>
        {component}
      </ApiProvider>
    </I18nextProvider>
  );
};

describe('SearchManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiService.get.mockResolvedValue({ data: { results: [], total: 0 } });
  });

  test('renders page title', async () => {
    renderWithProvider(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Search Management')).toBeInTheDocument();
    });
  });

  test('renders within AdminLayout', async () => {
    renderWithProvider(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    });
  });

  test('shows empty state when no pinned results', async () => {
    renderWithProvider(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('No pinned results yet')).toBeInTheDocument();
    });
  });

  test('renders resource type selector with options', async () => {
    renderWithProvider(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Resource Type')).toBeInTheDocument();
    });
  });

  test('displays pinned results when available', async () => {
    const mockResults = [
      { id: 1, resource_type: 'book', resource_id: 123, priority: 0, active: true },
      { id: 2, resource_type: 'author', resource_id: 456, priority: 1, active: true },
    ];

    mockApiService.get.mockResolvedValueOnce({
      data: { results: mockResults, total: 2 }
    });

    renderWithProvider(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/book #123/i)).toBeInTheDocument();
      expect(screen.getByText(/author #456/i)).toBeInTheDocument();
    });
  });

  test('shows priority badges for pinned items', async () => {
    const mockResults = [
      { id: 1, resource_type: 'book', resource_id: 123, priority: 0, active: true },
    ];

    mockApiService.get.mockResolvedValueOnce({
      data: { results: mockResults, total: 1 }
    });

    renderWithProvider(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Priority 0')).toBeInTheDocument();
    });
  });

  test('displays active/inactive status for pinned items', async () => {
    const mockResults = [
      { id: 1, resource_type: 'book', resource_id: 123, priority: 0, active: true },
      { id: 2, resource_type: 'author', resource_id: 456, priority: 1, active: false },
    ];

    mockApiService.get.mockResolvedValueOnce({
      data: { results: mockResults, total: 2 }
    });

    renderWithProvider(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  test('calls unpin API when unpin button clicked', async () => {
    const mockResults = [
      { id: 1, resource_type: 'book', resource_id: 123, priority: 0, active: true },
    ];

    mockApiService.get.mockResolvedValueOnce({
      data: { results: mockResults, total: 1 }
    });

    renderWithProvider(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/book #123/i)).toBeInTheDocument();
    });

    const unpinButton = screen.getByRole('button', { name: /Unpin/i });
    fireEvent.click(unpinButton);

    await waitFor(() => {
      expect(mockApiService.delete).toHaveBeenCalledWith('/admin/search/pinned/1');
    });
  });

  test('handles API errors gracefully', async () => {
    mockApiService.get.mockRejectedValueOnce({
      response: { data: { message: 'API Error occurred' } }
    });

    renderWithProvider(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('API Error occurred')).toBeInTheDocument();
    });
  });

  test('handles API errors without response data', async () => {
    mockApiService.get.mockRejectedValueOnce(new Error('Network Error'));

    renderWithProvider(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch pinned results')).toBeInTheDocument();
    });
  });

  test('filters by resource type when selector changes', async () => {
    renderWithProvider(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Resource Type')).toBeInTheDocument();
    });

    const selector = screen.getByLabelText('Resource Type');

    // Clear previous calls
    mockApiService.get.mockClear();

    // Change to 'book' filter
    fireEvent.mouseDown(selector);
    const bookOption = await screen.findByText('Books');
    fireEvent.click(bookOption);

    // Should trigger a new API call with resource_type filter
    await waitFor(() => {
      expect(mockApiService.get).toHaveBeenCalled();
    });
  });
});
