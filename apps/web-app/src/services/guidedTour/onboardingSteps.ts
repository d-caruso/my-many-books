import type { TourStep } from '../../pages/HowTo/howToContent';

/**
 * Short first-login tour covering the core add-book workflow.
 * Empty target selectors render centered Driver.js popovers.
 */
export const ONBOARDING_TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '',
    titleKey: 'tutorial:onboarding.welcome.title',
    bodyKey: 'tutorial:onboarding.welcome.body',
  },
  {
    targetSelector: '[data-tour-id="add-book-btn"]',
    titleKey: 'tutorial:onboarding.add_book_btn.title',
    bodyKey: 'tutorial:onboarding.add_book_btn.body',
  },
  {
    targetSelector: '[data-tour-id="isbn-field"]',
    titleKey: 'tutorial:onboarding.isbn_field.title',
    bodyKey: 'tutorial:onboarding.isbn_field.body',
    navigateTo: '/?mode=add',
  },
  {
    targetSelector: '[data-tour-id="book-form-author-select"]',
    titleKey: 'tutorial:onboarding.authors_section.title',
    bodyKey: 'tutorial:onboarding.authors_section.body',
  },
  {
    targetSelector: '[data-tour-id="book-form-save-btn"]',
    titleKey: 'tutorial:onboarding.save_btn.title',
    bodyKey: 'tutorial:onboarding.save_btn.body',
  },
  {
    targetSelector: '',
    titleKey: 'tutorial:onboarding.done.title',
    bodyKey: 'tutorial:onboarding.done.body',
  },
];
