import React from 'react';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HookExecutions } from '../../pages/Admin/Hooks/HookExecutions';
import { ApiProvider } from '../../contexts/ApiContext';

const mockGetExecutions = vi.fn();

vi.mock('../../contexts/ApiContext', async () => {
  const actual = await vi.importActual('../../contexts/ApiContext');
  return {
    ...actual,
    useApi: () => ({
      apiService: {
        getAdminHookExecutions: mockGetExecutions,
      },
    }),
  };
});

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
            executions: {
              filters: {
                status: 'Status',
                success: 'Success',
                failure: 'Failure',
                all: 'All',
                from: 'From',
                to: 'To',
              },
              columns: {
                event_name: 'Event',
                success: 'Success',
                duration: 'Duration (ms)',
                executed_at: 'Executed At',
                error: 'Error',
              },
              actions: {
                refresh: 'Refresh',
                back: 'Back to Hooks',
              },
              errors: {
                fetch: 'Failed to load executions',
              },
            },
          },
        },
      },
    },
  },
});

const renderWithRouter = (ui: React.ReactElement) =>
  rtlRender(
    <I18nextProvider i18n={testI18n}>
      <ApiProvider>
        <MemoryRouter initialEntries={['/admin/hooks/11/executions']}>
          <Routes>
            <Route path="/admin/hooks/:hookId/executions" element={ui} />
          </Routes>
        </MemoryRouter>
      </ApiProvider>
    </I18nextProvider>
  );

describe('HookExecutions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetExecutions.mockResolvedValue({
      executions: [
        {
          id: 1,
          hookId: 11,
          eventName: 'book.create',
          success: true,
          executionTimeMs: 120,
          executedAt: '2025-12-01T10:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  test('fetches executions and renders grid', async () => {
    renderWithRouter(<HookExecutions />);
    await waitFor(() => {
      expect(mockGetExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ hookId: 11, page: 1 })
      );
    });
    expect(await screen.findByTestId('mock-data-grid')).toBeInTheDocument();
    expect(screen.getByText('book.create')).toBeInTheDocument();
  });

  test('refresh button re-fetches data', async () => {
    renderWithRouter(<HookExecutions />);
    await waitFor(() => expect(mockGetExecutions).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => {
      expect(mockGetExecutions.mock.calls.length).toBeGreaterThan(1);
    });
  });
});
