import React from 'react';
import { render as rtlRender, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ApiProvider } from '../../../contexts/ApiContext';
import { HookConfigurationPage } from '../../../pages/Admin/MobileHooks/HookConfigurationPage';

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
}));

const buildApiService = (overrides: Record<string, any> = {}) => {
  const apiService = {
    getAdminMobileHooksListenerSettings: vi.fn().mockResolvedValue({
      settings: {
        analyticsEnabled: true,
        errorReportingEnabled: true,
        offlineStorageEnabled: true,
        performanceMonitoringEnabled: true,
        batchUploadInterval: 300,
        maxOfflineEvents: 1000,
      },
      lastUpdated: null,
      version: '1.0.0',
    }),
    getAdminMobileHooksActionTypes: vi.fn().mockResolvedValue({
      actions: {
        email: {
          description: 'Email notifications',
          enabled: true,
          configured: true,
          warnings: [],
          settings: { enabled: true, rate_limit_minutes: 5 },
        },
      },
    }),
    updateAdminMobileHooksListenerSettings: vi.fn().mockResolvedValue({
      settings: {
        analyticsEnabled: true,
        errorReportingEnabled: true,
        offlineStorageEnabled: true,
        performanceMonitoringEnabled: true,
        batchUploadInterval: 300,
        maxOfflineEvents: 1000,
      },
      updated: [],
      lastUpdated: '2026-01-30T12:01:00.000Z',
    }),
    updateAdminMobileHooksActionTypeSettings: vi.fn().mockResolvedValue({
      actionType: 'email',
      settings: { enabled: true, rate_limit_minutes: 5 },
      updated: [],
      lastUpdated: '2026-01-30T12:01:00.000Z',
    }),
    testAdminMobileHooksActionsConfig: vi.fn(),
    testAdminMobileHooksActionType: vi.fn(),
    ...overrides,
  };

  return apiService as any;
};

const renderWithApi = (apiServiceOverrides: Record<string, any> = {}) => {
  const apiService = buildApiService(apiServiceOverrides);
  return rtlRender(
    <ApiProvider apiService={apiService}>
      <HookConfigurationPage />
    </ApiProvider>
  );
};

describe('HookConfigurationPage', () => {
  it('renders configuration sections after loading', async () => {
    renderWithApi();

    expect(screen.getByText('Mobile Hooks Configuration')).toBeInTheDocument();

    expect(await screen.findByText('Listener settings')).toBeInTheDocument();
    expect(screen.getByText('Action settings')).toBeInTheDocument();
    expect(screen.getByText('Rate limiting')).toBeInTheDocument();
    expect(screen.getByText('Configuration test')).toBeInTheDocument();
    expect(screen.getByText('Action type test')).toBeInTheDocument();
  });

  it('saves listener settings and shows success without refresh', async () => {
    const updateAdminMobileHooksListenerSettings = vi.fn().mockResolvedValue({
      settings: {
        analyticsEnabled: false,
        errorReportingEnabled: true,
        offlineStorageEnabled: true,
        performanceMonitoringEnabled: true,
        batchUploadInterval: 300,
        maxOfflineEvents: 1000,
      },
      updated: ['analyticsEnabled'],
      lastUpdated: '2026-01-30T12:01:00.000Z',
    });

    renderWithApi({
      updateAdminMobileHooksListenerSettings,
    });

    const listenerHeading = await screen.findByRole('heading', { name: 'Listener settings' });
    const analyticsToggle = screen.getByRole('switch', { name: 'Analytics enabled' });
    expect(analyticsToggle).toBeChecked();

    fireEvent.click(analyticsToggle);

    const headerContainer = listenerHeading.closest('div')?.parentElement;
    if (!headerContainer) throw new Error('Listener settings header container not found');
    fireEvent.click(within(headerContainer).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateAdminMobileHooksListenerSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          analyticsEnabled: false,
        })
      );
    });

    expect(await screen.findByText('Listener settings updated.')).toBeInTheDocument();
  });

  it('executes config test + action type test and renders results', async () => {
    const testAdminMobileHooksActionsConfig = vi.fn().mockResolvedValue({
      success: true,
      eventType: 'error.unhandled',
      payload: { test: true },
      mappedActions: ['email'],
      actionResults: [
        {
          actionType: 'email',
          enabled: true,
          wouldExecute: true,
          settings: { enabled: true },
        },
      ],
      summary: {
        totalActions: 1,
        enabledActions: 1,
        wouldExecute: 1,
      },
      testedAt: '2026-01-30T12:02:00.000Z',
    });

    const testAdminMobileHooksActionType = vi.fn().mockResolvedValue({
      actionType: 'email',
      enabled: true,
      dryRun: true,
      testPayload: { test: true },
      execution: {
        success: true,
        message: 'ok',
      },
      settings: { enabled: true },
      testedAt: '2026-01-30T12:03:00.000Z',
    });

    renderWithApi({
      testAdminMobileHooksActionsConfig,
      testAdminMobileHooksActionType,
    });

    await screen.findByText('Configuration test');

    const runButtons = await screen.findAllByRole('button', { name: 'Run test' });
    expect(runButtons.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(runButtons[0]);

    await waitFor(() => {
      expect(testAdminMobileHooksActionsConfig).toHaveBeenCalledWith({
        eventType: 'error.unhandled',
        payload: { test: true },
      });
    });

    expect(await screen.findByText(/"mappedActions":/)).toBeInTheDocument();

    fireEvent.click(runButtons[1]);

    await waitFor(() => {
      expect(testAdminMobileHooksActionType).toHaveBeenCalledWith('email', {
        dryRun: true,
        testData: { test: true },
      });
    });

    expect(await screen.findByText(/"execution":/)).toBeInTheDocument();
  });
});
