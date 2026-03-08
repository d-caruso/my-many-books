import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import HowToPage from '../../pages/HowTo/HowToPage';
import {
  HOW_TO_SECTIONS,
  getVisibleTutorialSections,
  type TutorialCapabilities,
} from '../../pages/HowTo/howToContent';
import * as howToContent from '../../pages/HowTo/howToContent';

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

const renderHowToPage = () =>
  render(
    <I18nextProvider i18n={testI18n}>
      <MemoryRouter>
        <HowToPage />
      </MemoryRouter>
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

  test('renders all phase 2 tutorial cards', () => {
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

  test('renders CTA as last element for every visible card', () => {
    renderHowToPage();

    const ctaButtons = screen.getAllByRole('button', { name: 'Try it now' });
    expect(ctaButtons).toHaveLength(visibleCardsCount);

    visibleSections.forEach((section) => {
      section.items.forEach((item) => {
        const card = screen.getByTestId(`how-to-card-${item.id}`);
        const ctaButton = within(card).getByTestId(`how-to-cta-${item.id}`);
        expect(ctaButton).toBeInTheDocument();

        const cardContent = card.firstElementChild as HTMLElement | null;
        expect(cardContent?.lastElementChild).toBe(within(card).getByTestId(`how-to-cta-container-${item.id}`));
      });
    });
  });

  test('keeps phase 2 without videos', () => {
    renderHowToPage();

    expect(document.querySelector('video')).toBeNull();
  });

  test('renders change password card and CTA when password feature is enabled', () => {
    const featureSpy = vi
      .spyOn(howToContent, 'getTutorialCapabilities')
      .mockReturnValue({ userPasswordFeature: true });

    renderHowToPage();

    expect(screen.getByTestId('how-to-card-change-password')).toBeInTheDocument();
    expect(screen.getByTestId('how-to-cta-change-password')).toBeInTheDocument();

    featureSpy.mockRestore();
  });
});
