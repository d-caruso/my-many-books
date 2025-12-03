import React from 'react';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ApiProvider } from '../../../contexts/ApiContext';
import { HooksPage } from '../../../pages/Admin/Hooks/HooksPage';
import { BrowserRouter } from 'react-router-dom';

const mockGetAdminHookStats = vi.fn();
const mockGetAdminHooks = vi.fn();
const mockReloadAdminHooks = vi.fn();

vi.mock('../../../contexts/ApiContext', async () => {
  const actual = await vi.importActual('../../../contexts/ApiContext');
  return {
    ...actual,
    useApi: () => ({
      apiService: {
        getAdminHookStats: mockGetAdminHookStats,
        getAdminHooks: mockGetAdminHooks,
        reloadAdminHooks: mockReloadAdminHooks,
      },
    }),
  };
});

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

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
          hooks: {
            title: 'Hooks Administration',
            stats: {
              total_hooks: 'Total Hooks',
              active_hooks: 'Active Hooks',
              executions_today: 'Executions Today',
              last_reload: 'Last Reload',
              never_reloaded: 'Never reloaded',
              reload_hint: 'Reload when you deploy new hook configurations.',
            },
            actions: {
              create: 'Create Hook',
              reload: 'Reload Hooks',
              reloading: 'Reloading Hooks...',
            },
            list_title: 'Hooks',
            list_summary: '{{count}} configured',
            list_action_info: '{{actionType}} • Priority {{priority}}',
            no_hooks: 'No hooks configured yet.',
            active: 'Active',
            inactive: 'Inactive',
            last_execution: 'Last executed {{timestamp}}',
            never_executed: 'Never executed',
            priority_label: 'Priority {{priority}}',
            errors: {
              fetch: 'Failed to load hook data.',
              reload: 'Failed to reload hooks.',
            },
          },
        },
      },
    },
  },
});

const renderWithProvider = (ui: React.ReactElement) => {
  return rtlRender(
    <BrowserRouter>
      <I18nextProvider i18n={testI18n}>
        <ApiProvider>
          {ui}
        </ApiProvider>
      </I18nextProvider>
    </BrowserRouter>
  );
};

describe('HooksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminHookStats.mockResolvedValue({
      totalHooks: 0,
      activeHooks: 0,
      executionsToday: 0,
    });
    mockGetAdminHooks.mockResolvedValue({ hooks: [] });
    mockReloadAdminHooks.mockResolvedValue(undefined);
  });

  test('renders hooks title', async () => {
    renderWithProvider(<HooksPage />);
    expect(await screen.findByText('Hooks Administration')).toBeInTheDocument();
  });

  test('shows loading indicator while fetching data', () => {
    mockGetAdminHookStats.mockReturnValue(new Promise(() => {}));
    mockGetAdminHooks.mockReturnValue(new Promise(() => {}));
    renderWithProvider(<HooksPage />);
    const loaders = screen.getAllByRole('progressbar');
    expect(loaders.length).toBeGreaterThanOrEqual(1);
  });

  test('shows error message if fetching stats fails', async () => {
    const errorMessage = 'Failed to load stats';
    mockGetAdminHookStats.mockRejectedValue(new Error(errorMessage));
    mockGetAdminHooks.mockRejectedValue(new Error('fail'));
    renderWithProvider(<HooksPage />);
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  test('renders stats and hook list after successful load', async () => {
    mockGetAdminHookStats.mockResolvedValue({
      totalHooks: 3,
      activeHooks: 2,
      executionsToday: 7,
      lastReloadedAt: '2025-12-04T12:00:00Z',
    });
    mockGetAdminHooks.mockResolvedValue({
      hooks: [
        {
          id: 1,
          name: 'Audit Hook',
          eventPattern: 'audit.**',
          actionType: 'log',
          isActive: true,
          priority: 10,
          lastExecution: '2025-12-03T08:00:00Z',
        },
      ],
    });

    renderWithProvider(<HooksPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Hooks')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    expect(screen.getByText('Active Hooks')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Audit Hook')).toBeInTheDocument();
    expect(screen.getByText('audit.**')).toBeInTheDocument();
    expect(screen.getByText('Reload Hooks')).toBeInTheDocument();
  });

  test('reload button triggers reload action', async () => {
    renderWithProvider(<HooksPage />);
    await waitFor(() => expect(mockGetAdminHookStats).toHaveBeenCalled());

    const reloadButton = screen.getByRole('button', { name: /Reload Hooks/ });
    fireEvent.click(reloadButton);

    await waitFor(() => {
      expect(mockReloadAdminHooks).toHaveBeenCalled();
    });
  });
});
