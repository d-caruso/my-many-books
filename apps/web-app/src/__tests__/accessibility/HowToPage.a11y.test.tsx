import React from 'react';
import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { expectNoA11yViolations } from '../utils/axe-helper';
import HowToPage from '../../pages/HowTo/HowToPage';

const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['tutorial'],
  defaultNS: 'tutorial',
  resources: {
    en: {
      tutorial: {
        page_title: 'How to',
        page_description: 'Quick guides',
        no_guides_available: 'No guides available right now.',
        cta_try_it_now: 'Try it now',
        sections: {
          library_workflows: 'Library workflows',
        },
      },
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

describe('HowToPage Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter>
          <HowToPage />
        </MemoryRouter>
      </I18nextProvider>
    );

    await expectNoA11yViolations(container);
  });
});
