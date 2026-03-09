import React from 'react';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import i18n from 'i18next';
import { ApiProvider } from '../../../contexts/ApiContext';
import { HookAnalyticsPage } from '../../../pages/Admin/MobileHooks/HookAnalyticsPage';

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
}));

const buildApiService = (overrides: Record<string, ReturnType<typeof vi.fn>> = {}) => {
  const apiService = {
    getHookActionStats: vi.fn().mockResolvedValue({
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
    }),
    ...overrides,
  };

  return apiService as unknown as import('../../../services/api').ApiService;
};

const renderWithApi = (apiServiceOverrides: Record<string, ReturnType<typeof vi.fn>> = {}) => {
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

    expect(await screen.findByRole('heading', { name: 'Execution stats' })).toBeInTheDocument();
  });

  it('shows loading indicator while fetching analytics', () => {
    renderWithApi({
      getHookActionStats: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    expect(screen.getAllByRole('progressbar').length).toBeGreaterThanOrEqual(1);
  });

  it('shows error message when analytics fetch fails', async () => {
    const expected = i18n.t('admin.mobile_hooks.errors.analytics.load', { ns: 'pages' });
    renderWithApi({
      getHookActionStats: vi.fn().mockRejectedValue(new Error('No analytics')),
    });

    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });

  it('refresh button reloads analytics in-place', async () => {
    const getHookActionStats = vi
      .fn()
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        actionTypeBreakdown: [
          {
            actionType: 'email',
            attempted: 10,
            successful: 8,
            failed: 2,
            successRate: 0.8,
            errorRate: 0.2,
          },
        ],
      });

    renderWithApi({ getHookActionStats });

    await screen.findByRole('heading', { name: 'Execution stats' });
    expect(getHookActionStats).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(getHookActionStats).toHaveBeenCalledTimes(2);
    });
  });
});
