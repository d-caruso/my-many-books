export interface TutorialVideo {
  src: string;
  poster?: string;
  captionKey: string;
  durationLabel?: string;
}

export type TutorialAvailability = 'always' | 'userPasswordFeature';

export interface TutorialItem {
  id: string;
  titleKey: string;
  descriptionKey: string;
  stepsKeys: string[];
  ctaLabelKey?: string;
  ctaPath?: string;
  video?: TutorialVideo;
  availability?: TutorialAvailability;
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

const buildStepsKeys = (cardPrefix: string, stepsCount = DEFAULT_STEPS_PER_CARD): string[] =>
  Array.from({ length: stepsCount }, (_value, index) => `${cardPrefix}.step_${index + 1}`);

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
    items: [
      {
        id: 'add-book',
        titleKey: 'cards.add_book.title',
        descriptionKey: 'cards.add_book.description',
        stepsKeys: buildStepsKeys('cards.add_book'),
      },
      {
        id: 'modify-book',
        titleKey: 'cards.modify_book.title',
        descriptionKey: 'cards.modify_book.description',
        stepsKeys: buildStepsKeys('cards.modify_book'),
      },
      {
        id: 'delete-book',
        titleKey: 'cards.delete_book.title',
        descriptionKey: 'cards.delete_book.description',
        stepsKeys: buildStepsKeys('cards.delete_book'),
      },
      {
        id: 'scanner',
        titleKey: 'cards.scanner.title',
        descriptionKey: 'cards.scanner.description',
        stepsKeys: buildStepsKeys('cards.scanner'),
      },
      {
        id: 'assign-authors-categories',
        titleKey: 'cards.assign_authors_categories.title',
        descriptionKey: 'cards.assign_authors_categories.description',
        stepsKeys: buildStepsKeys('cards.assign_authors_categories'),
      },
      {
        id: 'add-authors-categories',
        titleKey: 'cards.add_authors_categories.title',
        descriptionKey: 'cards.add_authors_categories.description',
        stepsKeys: buildStepsKeys('cards.add_authors_categories'),
      },
      {
        id: 'modify-delete-authors-categories',
        titleKey: 'cards.modify_delete_authors_categories.title',
        descriptionKey: 'cards.modify_delete_authors_categories.description',
        stepsKeys: buildStepsKeys('cards.modify_delete_authors_categories'),
      },
      {
        id: 'change-password',
        titleKey: 'cards.change_password.title',
        descriptionKey: 'cards.change_password.description',
        stepsKeys: buildStepsKeys('cards.change_password'),
        availability: 'userPasswordFeature',
      },
    ],
  },
];
