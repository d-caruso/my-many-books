import React from 'react';
import { render as rtlRender, screen, waitFor, fireEvent, within } from '@testing-library/react';
import i18n from 'i18next';
import { ApiProvider } from '../../../contexts/ApiContext';
import { MobileHookDashboardPage } from '../../../pages/Admin/MobileHooks/MobileHookDashboardPage';

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
}));

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
}));

const buildApiService = (overrides: Record<string, ReturnType<typeof vi.fn>> = {}) => {
  const apiService = {
    getAdminMobileHooksHealth: vi.fn().mockResolvedValue({
      status: 'healthy',
      healthScore: 100,
      checks: {
        settingsLoaded: true,
        emergencyEnabled: true,
        analyticsActive: true,
        errorReportingActive: true,
        offlineStorageActive: true,
        performanceMonitoringActive: true,
      },
      timestamp: '2026-01-30T12:00:00.000Z',
    }),
    getAdminMobileHooksEmergencyStatus: vi.fn().mockResolvedValue({
      enabled: true,
      disabledAt: null,
      disabledReason: null,
    }),
    getAdminMobileHooksConfigListeners: vi.fn().mockResolvedValue({
      listeners: {
        'error.unhandled': { enabled: true },
      },
      categories: {
        errors: { enabled: true },
      },
      availableEvents: ['error.unhandled'],
      lastUpdated: null,
    }),
    getAdminMobileHooksActionsConfigMappings: vi.fn().mockResolvedValue({
      actions: {
        'error.unhandled': ['email'],
      },
      actionSettings: {},
      availableEvents: ['error.unhandled'],
      lastUpdated: null,
    }),
    getAdminMobileHooksActionTypes: vi.fn().mockResolvedValue({
      actions: {
        email: {
          description: 'Email notifications',
          enabled: true,
          configured: true,
          warnings: [],
          settings: { enabled: true },
        },
      },
    }),
    updateAdminMobileHooksConfigListeners: vi.fn().mockResolvedValue({
      updated: ['listeners.error.unhandled.enabled'],
      lastUpdated: '2026-01-30T12:01:00.000Z',
    }),
    updateAdminMobileHooksActionsConfigMappings: vi.fn().mockResolvedValue({
      config: {
        actions: {
          'error.unhandled': ['email'],
        },
        actionSettings: {},
        availableEvents: ['error.unhandled'],
        lastUpdated: null,
      },
      updated: ['actions'],
      lastUpdated: '2026-01-30T12:01:00.000Z',
    }),
    updateAdminMobileHooksEmergencyStatus: vi.fn().mockResolvedValue({
      enabled: true,
      updatedAt: '2026-01-30T12:01:00.000Z',
      message: 'ok',
    }),
    ...overrides,
  };

  return apiService as unknown as import('../../../services/api').ApiService;
};

const renderWithApi = (apiServiceOverrides: Record<string, ReturnType<typeof vi.fn>> = {}) => {
  const apiService = buildApiService(apiServiceOverrides);
  return rtlRender(
    <ApiProvider apiService={apiService}>
      <MobileHookDashboardPage />
    </ApiProvider>
  );
};

describe('MobileHookDashboardPage', () => {
  it('renders dashboard title and sections after loading', async () => {
    renderWithApi();

    expect(screen.getByText('Mobile Hooks')).toBeInTheDocument();

    expect(await screen.findByText('Mobile Hooks Overview')).toBeInTheDocument();
    expect(screen.getByText('Hook listeners (events)')).toBeInTheDocument();
    expect(screen.getByText('Hook → action mappings')).toBeInTheDocument();
    expect(screen.getByText('Emergency controls')).toBeInTheDocument();
  });

  it('shows loading indicator while fetching data', () => {
    renderWithApi({
      getAdminMobileHooksHealth: vi.fn().mockReturnValue(new Promise(() => {})),
      getAdminMobileHooksEmergencyStatus: vi.fn().mockReturnValue(new Promise(() => {})),
      getAdminMobileHooksConfigListeners: vi.fn().mockReturnValue(new Promise(() => {})),
      getAdminMobileHooksActionsConfigMappings: vi.fn().mockReturnValue(new Promise(() => {})),
      getAdminMobileHooksActionTypes: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    expect(screen.getAllByRole('progressbar').length).toBeGreaterThanOrEqual(1);
  });

  it('shows error message when loading fails', async () => {
    const expected = i18n.t('admin.mobile_hooks.errors.dashboard.load', { ns: 'pages' });
    renderWithApi({
      getAdminMobileHooksHealth: vi.fn().mockRejectedValue(new Error('Boom')),
    });

    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });

  it('persists per-event listener toggle changes without a page refresh', async () => {
    const updateAdminMobileHooksConfigListeners = vi.fn().mockResolvedValue({
      updated: ['listeners.error.unhandled.enabled'],
      lastUpdated: '2026-01-30T12:01:00.000Z',
    });

    renderWithApi({
      getAdminMobileHooksConfigListeners: vi.fn().mockResolvedValue({
        listeners: {
          'error.unhandled': { enabled: false },
        },
        categories: {
          errors: { enabled: true },
        },
        availableEvents: ['error.unhandled'],
        lastUpdated: null,
      }),
      updateAdminMobileHooksConfigListeners,
    });

    const listenersHeading = await screen.findByRole('heading', { name: 'Hook listeners (events)' });
    const listenersSection = listenersHeading.closest('.MuiPaper-root');
    if (!listenersSection) throw new Error('Listeners section not found');
    const toggle = listenersSection.querySelector('input[type="checkbox"]');
    if (!toggle) throw new Error('Listener toggle not found');

    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateAdminMobileHooksConfigListeners).toHaveBeenCalledWith({
        listeners: {
          'error.unhandled': { enabled: true },
        },
      });
    });

    await waitFor(() => {
      expect(toggle).toBeChecked();
    });
  });

  it('persists hook→action mapping updates and keeps UI in sync', async () => {
    const updateAdminMobileHooksActionsConfigMappings = vi.fn().mockImplementation(async (request: { actions: Record<string, string[]> }) => ({
      config: {
        actions: request.actions,
        actionSettings: {},
        availableEvents: ['error.unhandled'],
        lastUpdated: null,
      },
      updated: ['actions'],
      lastUpdated: '2026-01-30T12:01:00.000Z',
    }));

    renderWithApi({
      getAdminMobileHooksActionsConfigMappings: vi.fn().mockResolvedValue({
        actions: {
          'error.unhandled': [],
        },
        actionSettings: {},
        availableEvents: ['error.unhandled'],
        lastUpdated: null,
      }),
      updateAdminMobileHooksActionsConfigMappings,
    });

    const mappingToggle = await screen.findByRole('checkbox', { name: 'error.unhandled → email' });
    expect(mappingToggle).not.toBeChecked();

    fireEvent.click(mappingToggle);

    await waitFor(() => {
      expect(updateAdminMobileHooksActionsConfigMappings).toHaveBeenCalledWith({
        actions: {
          'error.unhandled': ['email'],
        },
      });
    });

    expect(mappingToggle).toBeChecked();
  });

  it('refresh button reloads dashboard data in-place', async () => {
    const getAdminMobileHooksHealth = vi.fn().mockResolvedValue({
      status: 'healthy',
      healthScore: 100,
      checks: {
        settingsLoaded: true,
        emergencyEnabled: true,
        analyticsActive: true,
        errorReportingActive: true,
        offlineStorageActive: true,
        performanceMonitoringActive: true,
      },
      timestamp: '2026-01-30T12:00:00.000Z',
    });

    renderWithApi({
      getAdminMobileHooksHealth,
    });

    await screen.findByText('Mobile Hooks Overview');
    expect(getAdminMobileHooksHealth).toHaveBeenCalledTimes(1);

    const header = screen.getByText('Mobile Hooks').closest('div');
    if (!header) throw new Error('Dashboard header not found');
    fireEvent.click(within(header).getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(getAdminMobileHooksHealth).toHaveBeenCalledTimes(2);
    });
  });
});
