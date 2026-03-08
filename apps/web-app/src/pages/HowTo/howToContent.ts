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
const DEFAULT_CTA_LABEL_KEY = 'cta_try_it_now';

const buildStepsKeys = (cardPrefix: string, stepsCount = DEFAULT_STEPS_PER_CARD): string[] =>
  Array.from({ length: stepsCount }, (_value, index) => `${cardPrefix}.step_${index + 1}`);

interface TutorialItemConfig {
  id: string;
  cardKey: string;
  ctaPath: string;
  availability?: TutorialAvailability;
}

const buildTutorialItem = ({
  id,
  cardKey,
  ctaPath,
  availability,
}: TutorialItemConfig): TutorialItem => ({
  id,
  titleKey: `cards.${cardKey}.title`,
  descriptionKey: `cards.${cardKey}.description`,
  stepsKeys: buildStepsKeys(`cards.${cardKey}`),
  ctaLabelKey: DEFAULT_CTA_LABEL_KEY,
  ctaPath,
  ...(availability ? { availability } : {}),
});

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
      buildTutorialItem({
        id: 'add-book',
        cardKey: 'add_book',
        ctaPath: '/?mode=add',
      }),
      buildTutorialItem({
        id: 'modify-book',
        cardKey: 'modify_book',
        ctaPath: '/',
      }),
      buildTutorialItem({
        id: 'delete-book',
        cardKey: 'delete_book',
        ctaPath: '/',
      }),
      buildTutorialItem({
        id: 'scanner',
        cardKey: 'scanner',
        ctaPath: '/scanner',
      }),
      buildTutorialItem({
        id: 'assign-authors-categories',
        cardKey: 'assign_authors_categories',
        ctaPath: '/?mode=add',
      }),
      buildTutorialItem({
        id: 'add-authors-categories',
        cardKey: 'add_authors_categories',
        ctaPath: '/?mode=add',
      }),
      buildTutorialItem({
        id: 'modify-delete-authors-categories',
        cardKey: 'modify_delete_authors_categories',
        ctaPath: '/?mode=add',
      }),
      buildTutorialItem({
        id: 'change-password',
        cardKey: 'change_password',
        ctaPath: '/account',
        availability: 'userPasswordFeature',
      }),
    ],
  },
];
