import React from 'react';
import { render as rtlRender, screen, waitFor, fireEvent, within } from '@testing-library/react';
import i18n from 'i18next';
import { ApiProvider } from '../../../contexts/ApiContext';
import { HookAnalyticsPage } from '../../../pages/Admin/MobileHooks/HookAnalyticsPage';

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
}));

const buildApiService = (overrides: Record<string, any> = {}) => {
  const apiService = {
    getMobileAnalyticsStats: vi.fn().mockResolvedValue({
      eventsProcessedToday: 5,
      eventsProcessedTotal: 50,
      failedEventsTotal: 2,
      errorRate: 0.04,
      avgProcessingTimeMs: 42,
      topEventTypes: [{ eventType: 'error.unhandled', count: 5 }],
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
      lastProcessed: '2026-01-30T12:00:00.000Z',
      systemStatus: 'healthy',
      timeSeries: [
        {
          bucketStart: '2026-01-30T12:00:00.000Z',
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
      generatedAt: '2026-01-30T12:05:00.000Z',
    }),
    ...overrides,
  };

  return apiService as any;
};

const renderWithApi = (apiServiceOverrides: Record<string, any> = {}) => {
  const apiService = buildApiService(apiServiceOverrides);
  return rtlRender(
    <ApiProvider apiService={apiService}>
      <HookAnalyticsPage />
    </ApiProvider>
  );
};

describe('HookAnalyticsPage', () => {
  it('renders analytics page and sections after loading', async () => {
    renderWithApi();

    expect(screen.getByText('Mobile Hooks Analytics')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Event volume' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Execution stats' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Error rate' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Performance' })).toBeInTheDocument();
  });

  it('shows loading indicator while fetching analytics', () => {
    renderWithApi({
      getMobileAnalyticsStats: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    expect(screen.getAllByRole('progressbar').length).toBeGreaterThanOrEqual(1);
  });

  it('shows error message when analytics fetch fails', async () => {
    const expected = i18n.t('admin.mobile_hooks.errors.analytics.load', { ns: 'pages' });
    renderWithApi({
      getMobileAnalyticsStats: vi.fn().mockRejectedValue(new Error('No analytics')),
    });

    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });

  it('refresh button reloads analytics in-place', async () => {
    const getMobileAnalyticsStats = vi
      .fn()
      .mockResolvedValueOnce({
        eventsProcessedToday: 5,
        eventsProcessedTotal: 50,
        failedEventsTotal: 2,
        errorRate: 0.04,
        avgProcessingTimeMs: 42,
        topEventTypes: [{ eventType: 'error.unhandled', count: 5 }],
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
        lastProcessed: '2026-01-30T12:00:00.000Z',
        systemStatus: 'healthy',
        timeSeries: [
          {
            bucketStart: '2026-01-30T12:00:00.000Z',
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
        generatedAt: '2026-01-30T12:05:00.000Z',
      })
      .mockResolvedValueOnce({
        eventsProcessedToday: 6,
        eventsProcessedTotal: 56,
        failedEventsTotal: 3,
        errorRate: 0.053,
        avgProcessingTimeMs: 45,
        topEventTypes: [{ eventType: 'error.unhandled', count: 6 }],
        eventTypeBreakdown: [
          {
            eventType: 'error.unhandled',
            attempted: 6,
            successful: 5,
            failed: 1,
            successRate: 0.833,
            errorRate: 0.167,
          },
        ],
        lastProcessed: '2026-01-30T12:10:00.000Z',
        systemStatus: 'healthy',
        timeSeries: [
          {
            bucketStart: '2026-01-30T12:10:00.000Z',
            processed: 5,
            failed: 1,
            total: 6,
          },
        ],
        actionTypeBreakdown: [
          {
            actionType: 'email',
            attempted: 6,
            successful: 5,
            failed: 1,
            successRate: 0.833,
            errorRate: 0.167,
          },
        ],
        generatedAt: '2026-01-30T12:11:00.000Z',
      });

    renderWithApi({ getMobileAnalyticsStats });

    await screen.findByRole('heading', { name: 'Event volume' });
    expect(getMobileAnalyticsStats).toHaveBeenCalledTimes(1);

    const processedTodayContainer = screen.getByText('Processed today').parentElement;
    if (!processedTodayContainer) throw new Error('Processed today container not found');
    expect(within(processedTodayContainer).getByText('5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(getMobileAnalyticsStats).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(within(processedTodayContainer).getByText('6')).toBeInTheDocument();
    });
  });
});
