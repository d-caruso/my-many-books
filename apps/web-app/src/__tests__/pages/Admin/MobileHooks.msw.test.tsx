import React from 'react';
import { fireEvent, renderWithI18n, screen, waitFor, within } from '../../test-utils';
import { server, resetMobileHooksState } from '../../mocks/server';
import { API_BASE_PATH } from '../../utils/apiBasePath';
import { http, HttpResponse } from 'msw';
import { vi } from 'vitest';
import enPages from '@my-many-books/shared-i18n/src/locales/en/pages.json';
import { MobileHookDashboardPage } from '../../../pages/Admin/MobileHooks/MobileHookDashboardPage';
import { HookAnalyticsPage } from '../../../pages/Admin/MobileHooks/HookAnalyticsPage';
import { HookConfigurationPage } from '../../../pages/Admin/MobileHooks/HookConfigurationPage';
import { MobileHookTestingPage } from '../../../pages/Admin/MobileHooks/MobileHookTestingPage';
import { MemoryRouter } from 'react-router-dom';
import { ApiProvider } from '../../../contexts/ApiContext';
import { MOBILE_ANALYTICS_PROCESSING_STATUS } from '@my-many-books/shared-types';

vi.mock('../../../config/env', async () => {
  const actual = (await vi.importActual('../../../config/env')) as any;
  const apiOrigin = 'http://localhost:3001';
  const apiBaseUrl = `${apiOrigin}/api/v1`;
  const env = {
    ...actual.env,
    API_ORIGIN: apiOrigin,
    API_URL: apiBaseUrl,
    API_BASE_URL: apiBaseUrl,
  };

  return {
    ...actual,
    env,
    default: env,
    API_ORIGIN: apiOrigin,
    API_URL: apiBaseUrl,
    API_BASE_URL: apiBaseUrl,
  };
});

vi.mock('../../../services/authService', () => ({
  authService: {
    getIdToken: vi.fn(async () => 'msw-token'),
    logout: vi.fn(),
    silentRefresh: vi.fn(async () => false),
  },
}));

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
}));

const now = new Date().toISOString();

const renderWithProviders = (ui: React.ReactElement) =>
  renderWithI18n(
    <ApiProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </ApiProvider>
  );

afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});

describe('Mobile Hooks dashboard (MSW)', () => {
  beforeEach(() => {
    resetMobileHooksState();
  });

  it('renders all panels after the API succeeds', async () => {
    renderWithProviders(<MobileHookDashboardPage />);
    expect(await screen.findByText('Mobile Hooks Overview')).toBeInTheDocument();
    expect(await screen.findByText('Hook listeners (events)')).toBeInTheDocument();
    expect(await screen.findByText('Hook → action mappings')).toBeInTheDocument();
    expect(await screen.findByText('Emergency controls')).toBeInTheDocument();
    expect(await screen.findByText('Recent hook events')).toBeInTheDocument();
  });

  it('shows a listeners error when the config endpoint fails', async () => {
    const expectedMessage = enPages.admin.mobile_hooks.errors.listeners.load;
    server.use(
      http.get(`*${API_BASE_PATH}/admin/mobile-hooks/config/listeners`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 })
      )
    );

    renderWithProviders(<MobileHookDashboardPage />);
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((alert) => alert.textContent?.includes(expectedMessage))).toBe(true);
  });

  it('refreshes dashboard data and polls recent events', async () => {
    resetMobileHooksState();
    let eventCall = 0;
    server.use(
      http.get(`*${API_BASE_PATH}/admin/mobile-hooks/analytics/events/recent`, () => {
        eventCall += 1;
        return HttpResponse.json({
          data: {
            events: [
              {
                eventId: `evt-${eventCall}`,
                eventType: `event-${eventCall}`,
                processingStatus: MOBILE_ANALYTICS_PROCESSING_STATUS.PROCESSED,
                processingError: null,
                createdAt: new Date().toISOString(),
                actionExecutions: [],
              },
            ],
          },
        });
      })
    );

    renderWithProviders(<MobileHookDashboardPage />);
    await waitFor(() => expect(eventCall).toBeGreaterThanOrEqual(1));

    const header = screen.getByText('Mobile Hooks').closest('div');
    if (!header) throw new Error('Dashboard header not found');
    fireEvent.click(within(header).getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(eventCall).toBeGreaterThanOrEqual(2));

    fireEvent.click(within(header).getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(eventCall).toBeGreaterThanOrEqual(3));
  });
});

describe('Hook analytics page (MSW)', () => {
  beforeEach(() => {
    resetMobileHooksState();
  });

  const baseStats = {
    eventsProcessedToday: 5,
    eventsProcessedTotal: 50,
    failedEventsTotal: 2,
    errorRate: 0.04,
    avgProcessingTimeMs: 42,
    eventTypeBreakdown: [
      {
        eventType: 'error.unhandled',
        attempted: 5,
        successful: 4,
        failed: 1,
        successRate: 0.8,
        errorRate: 0.2,
      },
    ],
    timeSeries: [
      {
        bucketStart: now,
        processed: 4,
        failed: 1,
        total: 5,
      },
    ],
    actionTypeBreakdown: [
      {
        actionType: 'email',
        attempted: 5,
        successful: 4,
        failed: 1,
        successRate: 0.8,
        errorRate: 0.2,
      },
    ],
    generatedAt: now,
    systemStatus: 'healthy',
    topEventTypes: [{ eventType: 'error.unhandled', count: 5 }],
  };

  it('renders analytics widgets after a successful load', async () => {
    renderWithProviders(<HookAnalyticsPage />);
    expect(screen.getByText('Mobile Hooks Analytics')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Execution stats' })).toBeInTheDocument();
  });

  it('shows an analytics error when the stats endpoint fails', async () => {
    const expectedMessage = enPages.admin.mobile_hooks.errors.analytics.load;
    server.use(
      http.get(`*${API_BASE_PATH}/admin/mobile-hooks/analytics/stats`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 })
      )
    );

    renderWithProviders(<HookAnalyticsPage />);
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((alert) => alert.textContent?.includes(expectedMessage))).toBe(true);
  });

  it('refreshes and polls the stats endpoint', async () => {
    let statsCall = 0;
    const statsHandler = vi.fn(() => {
      statsCall += 1;
      return HttpResponse.json({
        data: {
          actionTypeBreakdown: baseStats.actionTypeBreakdown,
        },
      });
    });

    server.use(http.get(`*${API_BASE_PATH}/admin/mobile-hooks/analytics/stats`, statsHandler));

    renderWithProviders(<HookAnalyticsPage />);
    await waitFor(() => expect(statsCall).toBeGreaterThanOrEqual(1));

    const header = screen.getByRole('heading', { name: 'Mobile Hooks Analytics' }).closest('div');
    if (!header) throw new Error('Analytics header missing');
    const refreshButton = within(header).getByRole('button', { name: 'Refresh' });
    await waitFor(() => expect(refreshButton).not.toBeDisabled());
    fireEvent.click(refreshButton);

    await waitFor(() => expect(statsCall).toBeGreaterThanOrEqual(2));
  });
});

describe('Hook configuration page (MSW)', () => {
  beforeEach(() => {
    resetMobileHooksState();
  });

  it('renders listener/action/rate-limit panels after loading', async () => {
    renderWithProviders(<HookConfigurationPage />);
    expect(await screen.findByText('Listener settings')).toBeInTheDocument();
    expect(await screen.findByText('Action settings')).toBeInTheDocument();
    expect(await screen.findByText('Rate limiting')).toBeInTheDocument();
    expect(await screen.findByText('Configuration test')).toBeInTheDocument();
  });

  it('shows an error when listener settings fail to load', async () => {
    const expectedMessage = enPages.admin.mobile_hooks.errors.listener_settings.load;
    server.use(
      http.get(`*${API_BASE_PATH}/admin/mobile-hooks/settings/listeners`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 })
      )
    );

    renderWithProviders(<HookConfigurationPage />);
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((alert) => alert.textContent?.includes(expectedMessage))).toBe(true);
  });
});

describe('Mobile hook testing page (MSW)', () => {
  beforeEach(() => {
    resetMobileHooksState();
  });

  it('renders the testing panel when data loads', async () => {
    renderWithProviders(<MobileHookTestingPage />);
    expect(await screen.findByText('Configuration test')).toBeInTheDocument();
    expect(screen.getByText('Action type test')).toBeInTheDocument();
  });

  it('shows an action types error when fetching fails', async () => {
    const expectedMessage = enPages.admin.mobile_hooks.errors.action_types.load;
    server.use(
      http.get(`*${API_BASE_PATH}/admin/mobile-hooks/actions-config/types`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 })
      )
    );

    renderWithProviders(<MobileHookTestingPage />);
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((alert) => alert.textContent?.includes(expectedMessage))).toBe(true);
  });
});
