import React from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { AdminSettingsPage } from '../../../pages/Admin/AdminSettingsPage';
import { apiService } from '../../../services/api';

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
}));

vi.mock('../../../services/api', () => ({
  apiService: {
    getAuditLoggingStatus: vi.fn(),
    updateAuditLoggingStatus: vi.fn(),
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
      {ui}
    </I18nextProvider>
  );
};

describe('AdminSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders settings title', async () => {
    vi.mocked(apiService.getAuditLoggingStatus).mockResolvedValue({
      enabled: false,
      source: 'default',
      canChange: true,
    });

    renderWithProvider(<AdminSettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Wait for async state updates
    await waitFor(() => {
      expect(apiService.getAuditLoggingStatus).toHaveBeenCalled();
    });
  });

  test('displays audit logging section', async () => {
    vi.mocked(apiService.getAuditLoggingStatus).mockResolvedValue({
      enabled: false,
      source: 'default',
      canChange: true,
    });

    renderWithProvider(<AdminSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Audit Logging')).toBeInTheDocument();
    });
  });

  test('renders within AdminLayout', async () => {
    vi.mocked(apiService.getAuditLoggingStatus).mockResolvedValue({
      enabled: false,
      source: 'default',
      canChange: true,
    });

    renderWithProvider(<AdminSettingsPage />);
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();

    // Wait for async state updates
    await waitFor(() => {
      expect(apiService.getAuditLoggingStatus).toHaveBeenCalled();
    });
  });
});
