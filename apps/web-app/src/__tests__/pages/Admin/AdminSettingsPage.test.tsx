import React from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { AdminSettingsPage } from '../../../pages/Admin/AdminSettingsPage';
import { apiService } from '../../../services/api';
import { ApiProvider } from '../../../contexts/ApiContext';
import { SettingsProvider } from '../../../contexts/SettingsContext';

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
}));

vi.mock('../../../services/api', () => ({
  apiService: {
    getAuditLoggingStatus: vi.fn(),
    updateAuditLoggingStatus: vi.fn(),
  },
}));

const mockApiService = {
  getAuditLoggingStatus: vi.fn(),
  updateAuditLoggingStatus: vi.fn(),
  baseURL: 'http://localhost:3000',
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
} as any;

const mockSettingsApi = {
  getSettings: vi.fn().mockResolvedValue([]),
  getAllSettingsAdmin: vi.fn().mockResolvedValue([
    {
      key: 'books.list.status.onchange',
      value: '"remove"',
      category: 'ui',
      type: 'enum',
      defaultValue: '"remove"',
      description: 'Behavior when book status changes',
      active: true,
      deleted: false,
      creationDate: new Date().toISOString(),
    }
  ]),
  updateSetting: vi.fn(),
} as any;

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
          settings: {
            page_title: 'Settings',
          },
        },
      },
    },
  },
});

const renderWithProvider = (ui: React.ReactElement) => {
  return rtlRender(
    <I18nextProvider i18n={testI18n}>
      <ApiProvider apiService={mockApiService}>
        <SettingsProvider settingsApi={mockSettingsApi}>
          {ui}
        </SettingsProvider>
      </ApiProvider>
    </I18nextProvider>
  );
};

describe('AdminSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiService.getAuditLoggingStatus.mockResolvedValue({
      enabled: false,
      source: 'default',
      canChange: true,
    });
    mockSettingsApi.getAllSettingsAdmin.mockResolvedValue([
      {
        key: 'books.list.status.onchange',
        value: '"remove"',
        category: 'ui',
        type: 'enum',
        defaultValue: '"remove"',
        description: 'Behavior when book status changes',
        active: true,
        deleted: false,
        creationDate: new Date().toISOString(),
      }
    ]);
  });

  test('renders settings title', async () => {
    renderWithProvider(<AdminSettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('displays audit logging section', async () => {
    renderWithProvider(<AdminSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Audit Logging')).toBeInTheDocument();
    });
  });

  test('renders within AdminLayout', () => {
    renderWithProvider(<AdminSettingsPage />);
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
  });
});
