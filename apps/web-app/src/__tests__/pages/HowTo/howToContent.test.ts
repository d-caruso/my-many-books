import { describe, expect, test } from 'vitest';
import type { TourStep, TutorialItem } from '../../../pages/HowTo/howToContent';

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
