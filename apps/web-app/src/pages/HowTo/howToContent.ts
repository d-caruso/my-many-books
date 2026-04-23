export interface TutorialVideoTrack {
  src: string;
  srcLang: 'en' | 'it';
  label: string;
}

export interface TutorialVideo {
  src: string;
  poster?: string;
  captionKey: string;
  durationLabel?: string;
  tracks: TutorialVideoTrack[];
}

export type TutorialAvailability = 'always' | 'userPasswordFeature';

export interface TourStep {
  targetSelector: string;
  titleKey: string;
  bodyKey: string;
  navigateTo?: string;
  prerequisiteClicks?: string[];
}

export interface TutorialItem {
  id: string;
  titleKey: string;
  descriptionKey: string;
  stepsKeys: string[];
  ctaLabelKey?: string;
  ctaPath?: string;
  ctaNoteKey?: string;
  video?: TutorialVideo;
  availability?: TutorialAvailability;
  tourSteps?: TourStep[];
}

export interface TutorialSection {
  id: string;
  titleKey: string;
  items: TutorialItem[];
}

export interface TutorialCapabilities {
  userPasswordFeature: boolean;
}

const DEFAULT_STEPS_PER_CARD = 4;
const DEFAULT_CTA_LABEL_KEY = 'cta_try_it_now';
const TUTORIAL_VIDEO_BASE_PATH = '/tutorials';
const TUTORIAL_VIDEO_POSTERS_BASE_PATH = `${TUTORIAL_VIDEO_BASE_PATH}/posters`;
const TUTORIAL_VIDEO_CAPTIONS_BASE_PATH = `${TUTORIAL_VIDEO_BASE_PATH}/captions`;
const TUTORIAL_CAPTION_LANGUAGES = ['en', 'it'] as const;

type TutorialCaptionLanguage = (typeof TUTORIAL_CAPTION_LANGUAGES)[number];

const TUTORIAL_CAPTION_LABELS: Record<TutorialCaptionLanguage, string> = {
  en: 'English',
  it: 'Italian',
};

const buildStepsKeys = (cardPrefix: string, stepsCount = DEFAULT_STEPS_PER_CARD): string[] =>
  Array.from({ length: stepsCount }, (_value, index) => `${cardPrefix}.step_${index + 1}`);

interface TutorialVideoConfig {
  mediaBaseName: string;
  captionKey: string;
  durationLabel?: string;
}

interface TutorialItemConfig {
  id: string;
  cardKey: string;
  ctaPath: string;
  ctaLabelKey?: string;
  ctaNoteKey?: string;
  video?: TutorialVideoConfig;
  availability?: TutorialAvailability;
  tourSteps?: TourStep[];
}

const buildTutorialVideo = ({
  mediaBaseName,
  captionKey,
  durationLabel,
}: TutorialVideoConfig): TutorialVideo => ({
  src: `${TUTORIAL_VIDEO_BASE_PATH}/${mediaBaseName}.mp4`,
  poster: `${TUTORIAL_VIDEO_POSTERS_BASE_PATH}/${mediaBaseName}.jpg`,
  captionKey,
  durationLabel,
  tracks: TUTORIAL_CAPTION_LANGUAGES.map((srcLang) => ({
    src: `${TUTORIAL_VIDEO_CAPTIONS_BASE_PATH}/${srcLang}/${mediaBaseName}.vtt`,
    srcLang,
    label: TUTORIAL_CAPTION_LABELS[srcLang],
  })),
});

const buildTutorialItem = ({
  id,
  cardKey,
  ctaPath,
  ctaLabelKey,
  ctaNoteKey,
  video,
  availability,
  tourSteps,
}: TutorialItemConfig): TutorialItem => ({
  id,
  titleKey: `cards.${cardKey}.title`,
  descriptionKey: `cards.${cardKey}.description`,
  stepsKeys: buildStepsKeys(`cards.${cardKey}`),
  ctaLabelKey: ctaLabelKey ?? DEFAULT_CTA_LABEL_KEY,
  ctaPath,
  ...(ctaNoteKey ? { ctaNoteKey } : {}),
  ...(video ? { video: buildTutorialVideo(video) } : {}),
  ...(availability ? { availability } : {}),
  ...(tourSteps ? { tourSteps } : {}),
});

interface LibraryTutorialItemConfig {
  id: string;
  cardKey: string;
  ctaPath: string;
  ctaLabelKey?: string;
  ctaNoteKey?: string;
  mediaBaseName?: string;
  durationLabel?: string;
  availability?: TutorialAvailability;
  tourSteps?: TourStep[];
}

const buildLibraryTutorialItem = ({
  id,
  cardKey,
  ctaPath,
  ctaLabelKey,
  ctaNoteKey,
  mediaBaseName,
  durationLabel,
  availability,
  tourSteps,
}: LibraryTutorialItemConfig): TutorialItem =>
  buildTutorialItem({
    id,
    cardKey,
    ctaPath,
    ctaLabelKey,
    ctaNoteKey,
    ...(mediaBaseName
      ? { video: { mediaBaseName, captionKey: `videos.${cardKey}.caption`, durationLabel } }
      : {}),
    availability,
    tourSteps,
  });

const ADD_BOOK_TOUR: TourStep[] = [
  {
    targetSelector: '[data-tour-id="add-book-btn"]',
    titleKey: 'tutorial:tour.add_book.step1.title',
    bodyKey: 'tutorial:tour.add_book.step1.body',
  },
  {
    targetSelector: '[data-tour-id="isbn-field"]',
    titleKey: 'tutorial:tour.add_book.step2.title',
    bodyKey: 'tutorial:tour.add_book.step2.body',
    navigateTo: '/?mode=add',
  },
  {
    targetSelector: '[data-tour-id="isbn-lookup-btn"]',
    titleKey: 'tutorial:tour.add_book.step3.title',
    bodyKey: 'tutorial:tour.add_book.step3.body',
  },
  {
    targetSelector: '[data-tour-id="book-form-title-field"]',
    titleKey: 'tutorial:tour.add_book.step4.title',
    bodyKey: 'tutorial:tour.add_book.step4.body',
  },
  {
    targetSelector: '[data-tour-id="book-form-save-btn"]',
    titleKey: 'tutorial:tour.add_book.step5.title',
    bodyKey: 'tutorial:tour.add_book.step5.body',
  },
];

const MODIFY_BOOK_TOUR: TourStep[] = [
  {
    targetSelector: '[data-tour-id="book-card-first"]',
    titleKey: 'tutorial:tour.modify_book.step1.title',
    bodyKey: 'tutorial:tour.modify_book.step1.body',
    navigateTo: '/',
  },
  {
    targetSelector: '[data-tour-id="book-card-first"]',
    titleKey: 'tutorial:tour.modify_book.step2.title',
    bodyKey: 'tutorial:tour.modify_book.step2.body',
  },
  {
    targetSelector: '[data-tour-id="book-detail-edit-btn"]',
    titleKey: 'tutorial:tour.modify_book.step3.title',
    bodyKey: 'tutorial:tour.modify_book.step3.body',
    prerequisiteClicks: ['[data-tour-id="book-card-first"]'],
  },
  {
    targetSelector: '[data-tour-id="book-form-title-field"]',
    titleKey: 'tutorial:tour.modify_book.step4.title',
    bodyKey: 'tutorial:tour.modify_book.step4.body',
    prerequisiteClicks: ['[data-tour-id="book-detail-edit-btn"]'],
  },
  {
    targetSelector: '[data-tour-id="book-form-save-btn"]',
    titleKey: 'tutorial:tour.modify_book.step5.title',
    bodyKey: 'tutorial:tour.modify_book.step5.body',
  },
];

const DELETE_BOOK_TOUR: TourStep[] = [
  {
    targetSelector: '[data-tour-id="book-card-first"]',
    titleKey: 'tutorial:tour.delete_book.step1.title',
    bodyKey: 'tutorial:tour.delete_book.step1.body',
    navigateTo: '/',
  },
  {
    targetSelector: '[data-tour-id="book-card-first"]',
    titleKey: 'tutorial:tour.delete_book.step2.title',
    bodyKey: 'tutorial:tour.delete_book.step2.body',
  },
  {
    targetSelector: '[data-tour-id="book-detail-delete-btn"]',
    titleKey: 'tutorial:tour.delete_book.step3.title',
    bodyKey: 'tutorial:tour.delete_book.step3.body',
    prerequisiteClicks: ['[data-tour-id="book-card-first"]'],
  },
  {
    targetSelector: '[data-tour-id="delete-confirm-btn"]',
    titleKey: 'tutorial:tour.delete_book.step4.title',
    bodyKey: 'tutorial:tour.delete_book.step4.body',
    prerequisiteClicks: ['[data-tour-id="book-detail-delete-btn"]'],
  },
];

const SCANNER_TOUR: TourStep[] = [
  {
    targetSelector: '[data-tour-id="scanner-manual-input"]',
    titleKey: 'tutorial:tour.scanner.step1.title',
    bodyKey: 'tutorial:tour.scanner.step1.body',
    navigateTo: '/scanner',
  },
  {
    targetSelector: '[data-tour-id="scanner-manual-input"]',
    titleKey: 'tutorial:tour.scanner.step2.title',
    bodyKey: 'tutorial:tour.scanner.step2.body',
  },
  {
    targetSelector: '[data-tour-id="book-form-title-field"]',
    titleKey: 'tutorial:tour.scanner.step3.title',
    bodyKey: 'tutorial:tour.scanner.step3.body',
    navigateTo: '/?mode=add',
  },
];

const ASSIGN_AUTHORS_CATEGORIES_TOUR: TourStep[] = [
  {
    targetSelector: '[data-tour-id="isbn-field"]',
    titleKey: 'tutorial:tour.assign_authors_categories.step1.title',
    bodyKey: 'tutorial:tour.assign_authors_categories.step1.body',
    navigateTo: '/?mode=add',
  },
  {
    targetSelector: '[data-tour-id="book-form-author-select"]',
    titleKey: 'tutorial:tour.assign_authors_categories.step2.title',
    bodyKey: 'tutorial:tour.assign_authors_categories.step2.body',
  },
  {
    targetSelector: '[data-tour-id="book-form-category-select"]',
    titleKey: 'tutorial:tour.assign_authors_categories.step3.title',
    bodyKey: 'tutorial:tour.assign_authors_categories.step3.body',
  },
  {
    targetSelector: '[data-tour-id="book-form-save-btn"]',
    titleKey: 'tutorial:tour.assign_authors_categories.step4.title',
    bodyKey: 'tutorial:tour.assign_authors_categories.step4.body',
  },
];

const ADD_AUTHORS_CATEGORIES_TOUR: TourStep[] = [
  {
    targetSelector: '[data-tour-id="isbn-field"]',
    titleKey: 'tutorial:tour.add_authors_categories.step1.title',
    bodyKey: 'tutorial:tour.add_authors_categories.step1.body',
    navigateTo: '/?mode=add',
  },
  {
    targetSelector: '[data-tour-id="book-form-author-add-btn"]',
    titleKey: 'tutorial:tour.add_authors_categories.step2.title',
    bodyKey: 'tutorial:tour.add_authors_categories.step2.body',
  },
  {
    targetSelector: '[data-tour-id="book-form-author-add-btn"]',
    titleKey: 'tutorial:tour.add_authors_categories.step3.title',
    bodyKey: 'tutorial:tour.add_authors_categories.step3.body',
    prerequisiteClicks: ['[data-tour-id="book-form-author-add-btn"]'],
  },
  {
    targetSelector: '[data-tour-id="book-form-save-btn"]',
    titleKey: 'tutorial:tour.add_authors_categories.step4.title',
    bodyKey: 'tutorial:tour.add_authors_categories.step4.body',
  },
];

const MODIFY_DELETE_AUTHORS_CATEGORIES_TOUR: TourStep[] = [
  {
    targetSelector: '[data-tour-id="isbn-field"]',
    titleKey: 'tutorial:tour.modify_delete_authors_categories.step1.title',
    bodyKey: 'tutorial:tour.modify_delete_authors_categories.step1.body',
    navigateTo: '/?mode=add',
  },
  {
    targetSelector: '[data-tour-id="book-form-author-manage-btn"]',
    titleKey: 'tutorial:tour.modify_delete_authors_categories.step2.title',
    bodyKey: 'tutorial:tour.modify_delete_authors_categories.step2.body',
  },
  {
    targetSelector: '[data-tour-id="entity-manage-dialog"]',
    titleKey: 'tutorial:tour.modify_delete_authors_categories.step3.title',
    bodyKey: 'tutorial:tour.modify_delete_authors_categories.step3.body',
    prerequisiteClicks: ['[data-tour-id="book-form-author-manage-btn"]'],
  },
  {
    targetSelector: '[data-tour-id="entity-manage-dialog"]',
    titleKey: 'tutorial:tour.modify_delete_authors_categories.step4.title',
    bodyKey: 'tutorial:tour.modify_delete_authors_categories.step4.body',
  },
];

const CHANGE_PASSWORD_TOUR: TourStep[] = [
  {
    targetSelector: '[data-tour-id="account-password-section"]',
    titleKey: 'tutorial:tour.change_password.step1.title',
    bodyKey: 'tutorial:tour.change_password.step1.body',
    navigateTo: '/account',
  },
  {
    targetSelector: '[data-tour-id="account-password-section"]',
    titleKey: 'tutorial:tour.change_password.step2.title',
    bodyKey: 'tutorial:tour.change_password.step2.body',
  },
  {
    targetSelector: '[data-tour-id="account-password-section"]',
    titleKey: 'tutorial:tour.change_password.step3.title',
    bodyKey: 'tutorial:tour.change_password.step3.body',
  },
  {
    targetSelector: '[data-tour-id="account-password-save-btn"]',
    titleKey: 'tutorial:tour.change_password.step4.title',
    bodyKey: 'tutorial:tour.change_password.step4.body',
  },
];

const LIBRARY_TUTORIAL_ITEM_CONFIGS: LibraryTutorialItemConfig[] = [
  {
    id: 'add-book',
    cardKey: 'add_book',
    ctaPath: '/?mode=add',
    ctaLabelKey: 'cta.add_book',
    mediaBaseName: 'add-book',
    tourSteps: ADD_BOOK_TOUR,
  },
  {
    id: 'modify-book',
    cardKey: 'modify_book',
    ctaPath: '/',
    ctaLabelKey: 'cta.go_to_library',
    tourSteps: MODIFY_BOOK_TOUR,
  },
  {
    id: 'delete-book',
    cardKey: 'delete_book',
    ctaPath: '/',
    ctaLabelKey: 'cta.go_to_library',
    tourSteps: DELETE_BOOK_TOUR,
  },
  {
    id: 'scanner',
    cardKey: 'scanner',
    ctaPath: '/scanner',
    ctaLabelKey: 'cta.open_scanner',
    ctaNoteKey: 'cta_note.camera_required',
    tourSteps: SCANNER_TOUR,
  },
  {
    id: 'assign-authors-categories',
    cardKey: 'assign_authors_categories',
    ctaPath: '/?mode=add',
    ctaLabelKey: 'cta.add_book',
    tourSteps: ASSIGN_AUTHORS_CATEGORIES_TOUR,
  },
  {
    id: 'add-authors-categories',
    cardKey: 'add_authors_categories',
    ctaPath: '/?mode=add',
    ctaLabelKey: 'cta.add_book',
    tourSteps: ADD_AUTHORS_CATEGORIES_TOUR,
  },
  {
    id: 'modify-delete-authors-categories',
    cardKey: 'modify_delete_authors_categories',
    ctaPath: '/?mode=add',
    ctaLabelKey: 'cta.add_book',
    tourSteps: MODIFY_DELETE_AUTHORS_CATEGORIES_TOUR,
  },
  {
    id: 'change-password',
    cardKey: 'change_password',
    ctaPath: '/account',
    ctaLabelKey: 'cta.go_to_account',
    availability: 'userPasswordFeature',
    tourSteps: CHANGE_PASSWORD_TOUR,
  },
];

const isFeatureEnabled = (value: string | boolean | undefined): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  return String(value ?? '').toLowerCase() === 'true';
};

export const getTutorialCapabilities = (
  env: Record<string, string | boolean | undefined> = import.meta.env
): TutorialCapabilities => ({
  userPasswordFeature: isFeatureEnabled(env.VITE_FEATURE_USER_PASSWORD),
});

export const isTutorialItemAvailable = (
  item: TutorialItem,
  capabilities: TutorialCapabilities
): boolean => {
  if (!item.availability || item.availability === 'always') {
    return true;
  }

  return capabilities[item.availability];
};

export const getVisibleTutorialSections = (
  sections: TutorialSection[],
  capabilities: TutorialCapabilities
): TutorialSection[] =>
  sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isTutorialItemAvailable(item, capabilities)),
    }))
    .filter((section) => section.items.length > 0);

export const HOW_TO_SECTIONS: TutorialSection[] = [
  {
    id: 'library',
    titleKey: 'sections.library_workflows',
    items: LIBRARY_TUTORIAL_ITEM_CONFIGS.map(buildLibraryTutorialItem),
  },
];
