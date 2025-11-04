import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { AdminSettingsPage } from '../../../pages/Admin/AdminSettingsPage';

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
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
            coming_soon: 'Settings configuration coming soon...',
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
  test('renders settings title', () => {
    renderWithProvider(<AdminSettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('displays coming soon message', () => {
    renderWithProvider(<AdminSettingsPage />);
    expect(screen.getByText('Settings configuration coming soon...')).toBeInTheDocument();
  });

  test('renders within AdminLayout', () => {
    renderWithProvider(<AdminSettingsPage />);
    expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
  });
});
