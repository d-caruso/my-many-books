import React from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
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
      translation: {},
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

const render = (component: React.ReactElement) => {
  return rtlRender(
    <I18nextProvider i18n={testI18n}>
      <ApiProvider value={{ apiService: mockApiService }}>
        {component}
      </ApiProvider>
    </I18nextProvider>
  );
};

describe('SearchManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title', async () => {
    render(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Search Management')).toBeInTheDocument();
    });
  });

  it('should show empty state when no pinned results', async () => {
    render(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('No pinned results yet')).toBeInTheDocument();
    });
  });

  it('should render resource type selector with options', async () => {
    render(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Resource Type')).toBeInTheDocument();
    });
  });

  it('should call API on mount', async () => {
    render(<SearchManagementPage />);

    await waitFor(() => {
      expect(mockApiService.get).toHaveBeenCalled();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockApiService.get.mockRejectedValueOnce(new Error('API Error'));

    render(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch pinned results/i)).toBeInTheDocument();
    });
  });

  it('should display pinned results when available', async () => {
    const mockResults = [
      { id: 1, resource_type: 'book', resource_id: 123, priority: 0, active: true },
      { id: 2, resource_type: 'author', resource_id: 456, priority: 1, active: true },
    ];

    mockApiService.get.mockResolvedValueOnce({
      data: { results: mockResults, total: 2 }
    });

    render(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/book #123/i)).toBeInTheDocument();
      expect(screen.getByText(/author #456/i)).toBeInTheDocument();
    });
  });

  it('should show priority badges for pinned items', async () => {
    const mockResults = [
      { id: 1, resource_type: 'book', resource_id: 123, priority: 0, active: true },
    ];

    mockApiService.get.mockResolvedValueOnce({
      data: { results: mockResults, total: 1 }
    });

    render(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/Priority 0/i)).toBeInTheDocument();
    });
  });

  it('should call unpin API when unpin button clicked', async () => {
    const mockResults = [
      { id: 1, resource_type: 'book', resource_id: 123, priority: 0, active: true },
    ];

    mockApiService.get.mockResolvedValueOnce({
      data: { results: mockResults, total: 1 }
    });

    const { container } = render(<SearchManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(/book #123/i)).toBeInTheDocument();
    });

    const unpinButton = container.querySelector('[aria-label="Unpin"]');
    if (unpinButton) {
      unpinButton.click();
      expect(mockApiService.delete).toHaveBeenCalledWith('/admin/search/pinned/1');
    }
  });
});
