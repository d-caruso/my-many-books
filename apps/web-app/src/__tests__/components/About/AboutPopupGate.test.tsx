import React from 'react';
import { render as rtlRender, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, test, beforeEach, afterEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { AboutPopupGate } from '../../../components/About/AboutPopupGate';

const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['common'],
  defaultNS: 'common',
  resources: {
    en: {
      common: {
        about_app_title: 'What this app is for',
        about_app_body: '<bold>My Many Books</bold> helps you organize your personal library, track reading status, search books, and manage your collection.',
        dont_show_again: "Don't show again",
        ok: 'OK',
      },
    },
  },
  interpolation: { escapeValue: false },
});

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nextProvider i18n={testI18n}>{children}</I18nextProvider>
);

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: Wrapper });

describe('AboutPopupGate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  test('shows the about popup on first load when no preference is stored', async () => {
    render(<AboutPopupGate />);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText('What this app is for')).toBeInTheDocument();
    expect(localStorage.getItem('about-popup-hidden')).toBeNull();
  });

  test('stores the preference and suppresses popup on remount when "Don\'t show again" is checked', async () => {
    const firstRender = render(<AboutPopupGate />);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('checkbox', { name: "Don't show again" }));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(localStorage.getItem('about-popup-hidden')).toBe('true');

    firstRender.unmount();

    render(<AboutPopupGate />);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
