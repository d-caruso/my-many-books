import { describe, expect, test } from 'vitest';
import {
  HOW_TO_SECTIONS,
  getVisibleTutorialSections,
  type TourStep,
  type TutorialItem,
} from '../../../pages/HowTo/howToContent';

describe('howToContent type contracts', () => {
  test('TourStep accepts a minimal step definition', () => {
    const step = {
      targetSelector: '[data-testid="book-search-input"]',
      titleKey: 'tour.search.title',
      bodyKey: 'tour.search.body',
    } satisfies TourStep;

    expect(step).toEqual({
      targetSelector: '[data-testid="book-search-input"]',
      titleKey: 'tour.search.title',
      bodyKey: 'tour.search.body',
    });
  });

  test('TourStep accepts navigateTo and prerequisiteClicks', () => {
    const step = {
      targetSelector: '[data-testid="scanner-open-button"]',
      titleKey: 'tour.scanner.title',
      bodyKey: 'tour.scanner.body',
      navigateTo: '/scanner',
      prerequisiteClicks: ['[data-testid="mobile-menu-toggle"]', '[data-testid="nav-scanner"]'],
    } satisfies TourStep;

    expect(step.navigateTo).toBe('/scanner');
    expect(step.prerequisiteClicks).toEqual([
      '[data-testid="mobile-menu-toggle"]',
      '[data-testid="nav-scanner"]',
    ]);
  });

  test('TutorialItem allows tourSteps to be omitted', () => {
    const item = {
      id: 'search-books',
      titleKey: 'cards.search_books.title',
      descriptionKey: 'cards.search_books.description',
      stepsKeys: [
        'cards.search_books.step_1',
        'cards.search_books.step_2',
        'cards.search_books.step_3',
      ],
      ctaLabelKey: 'cta.try_it_now',
      ctaPath: '/search',
    } satisfies TutorialItem;

    expect(item).not.toHaveProperty('tourSteps');
  });
});

describe('howToContent tour step definitions', () => {
  const allItems = HOW_TO_SECTIONS.flatMap((section) => section.items);

  test('every card has a non-empty tourSteps array', () => {
    expect(allItems).toHaveLength(8);

    for (const item of allItems) {
      expect(item.tourSteps).toBeDefined();
      expect(item.tourSteps).not.toHaveLength(0);
    }
  });

  test('every tourStep targets a data-tour-id selector', () => {
    for (const item of allItems) {
      for (const step of item.tourSteps ?? []) {
        expect(step.targetSelector).toMatch(/^\[data-tour-id="/);
      }
    }
  });

  test('every tourStep has titleKey and bodyKey', () => {
    for (const item of allItems) {
      for (const step of item.tourSteps ?? []) {
        expect(step.titleKey).toBeTruthy();
        expect(step.bodyKey).toBeTruthy();
      }
    }
  });

  test('visible cards preserve their tourSteps after capability filtering', () => {
    const [section] = getVisibleTutorialSections(HOW_TO_SECTIONS, { userPasswordFeature: false });

    expect(section.items).toHaveLength(7);
    expect(section.items.every((item) => item.tourSteps && item.tourSteps.length > 0)).toBe(true);
    expect(section.items.some((item) => item.id === 'change-password')).toBe(false);
  });
});
