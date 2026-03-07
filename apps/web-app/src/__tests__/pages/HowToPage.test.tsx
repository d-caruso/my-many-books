import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HowToPage from '../../pages/HowTo/HowToPage';
import {
  HOW_TO_SECTIONS,
  getVisibleTutorialSections,
  type TutorialCapabilities,
} from '../../pages/HowTo/howToContent';

const testI18n = i18n.createInstance();
const i18nReady = testI18n.use(initReactI18next).init({
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

const renderHowToPage = () =>
  render(
    <I18nextProvider i18n={testI18n}>
      <HowToPage />
    </I18nextProvider>
  );

describe('HowToPage', () => {
  const defaultCapabilities: TutorialCapabilities = {
    userPasswordFeature: false,
  };
  const visibleSections = getVisibleTutorialSections(HOW_TO_SECTIONS, defaultCapabilities);
  const visibleCardsCount = visibleSections.reduce((total, section) => total + section.items.length, 0);

  beforeAll(async () => {
    await i18nReady;
  });

  test('renders all phase 1 tutorial cards', () => {
    renderHowToPage();

    expect(screen.getByRole('heading', { level: 1, name: 'How to' })).toBeInTheDocument();
    expect(screen.getAllByTestId(/^how-to-card-/)).toHaveLength(visibleCardsCount);
    expect(screen.queryByTestId('how-to-card-change-password')).not.toBeInTheDocument();
  });

  test('renders 3-5 quick steps for every card', () => {
    renderHowToPage();

    visibleSections.forEach((section) => {
      section.items.forEach((item) => {
        const card = screen.getByTestId(`how-to-card-${item.id}`);
        const steps = within(card).getAllByRole('listitem');
        expect(steps.length).toBeGreaterThanOrEqual(3);
        expect(steps.length).toBeLessThanOrEqual(5);
      });
    });
  });

  test('renders phase 1 content only (no CTA and no videos)', () => {
    renderHowToPage();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(document.querySelector('video')).toBeNull();
  });
});
