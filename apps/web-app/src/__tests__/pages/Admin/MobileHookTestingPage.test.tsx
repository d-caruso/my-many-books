import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { ApiProvider } from '../../../contexts/ApiContext';
import { MobileHookTestingPage } from '../../../pages/Admin/MobileHooks/MobileHookTestingPage';

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
}));

describe('MobileHookTestingPage', () => {
  it('renders testing page and panels', async () => {
    const apiService = {
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
      testAdminMobileHooksActionsConfig: vi.fn(),
      testAdminMobileHooksActionType: vi.fn(),
    } as any;

    rtlRender(
      <ApiProvider apiService={apiService}>
        <MobileHookTestingPage />
      </ApiProvider>
    );

    expect(screen.getByText('Mobile Hooks Testing')).toBeInTheDocument();
    expect(await screen.findByText('Configuration test')).toBeInTheDocument();
    expect(screen.getByText('Action type test')).toBeInTheDocument();
  });
});

