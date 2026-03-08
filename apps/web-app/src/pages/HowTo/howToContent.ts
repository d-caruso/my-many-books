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
const TUTORIAL_VIDEO_BASE_PATH = '/tutorials';
const TUTORIAL_VIDEO_POSTERS_BASE_PATH = `${TUTORIAL_VIDEO_BASE_PATH}/posters`;

const buildStepsKeys = (cardPrefix: string, stepsCount = DEFAULT_STEPS_PER_CARD): string[] =>
  Array.from({ length: stepsCount }, (_value, index) => `${cardPrefix}.step_${index + 1}`);

interface TutorialVideoConfig {
  fileName: string;
  posterFileName: string;
  captionKey: string;
  durationLabel?: string;
}

interface TutorialItemConfig {
  id: string;
  cardKey: string;
  ctaPath: string;
  video?: TutorialVideoConfig;
  availability?: TutorialAvailability;
}

const buildTutorialVideo = ({
  fileName,
  posterFileName,
  captionKey,
  durationLabel,
}: TutorialVideoConfig): TutorialVideo => ({
  src: `${TUTORIAL_VIDEO_BASE_PATH}/${fileName}`,
  poster: `${TUTORIAL_VIDEO_POSTERS_BASE_PATH}/${posterFileName}`,
  captionKey,
  durationLabel,
});

const buildTutorialItem = ({
  id,
  cardKey,
  ctaPath,
  video,
  availability,
}: TutorialItemConfig): TutorialItem => ({
  id,
  titleKey: `cards.${cardKey}.title`,
  descriptionKey: `cards.${cardKey}.description`,
  stepsKeys: buildStepsKeys(`cards.${cardKey}`),
  ctaLabelKey: DEFAULT_CTA_LABEL_KEY,
  ctaPath,
  ...(video ? { video: buildTutorialVideo(video) } : {}),
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
        video: {
          fileName: 'add-book.mp4',
          posterFileName: 'add-book.jpg',
          captionKey: 'videos.add_book.caption',
          durationLabel: '00:20',
        },
      }),
      buildTutorialItem({
        id: 'modify-book',
        cardKey: 'modify_book',
        ctaPath: '/',
        video: {
          fileName: 'edit-book.mp4',
          posterFileName: 'edit-book.jpg',
          captionKey: 'videos.modify_book.caption',
          durationLabel: '00:20',
        },
      }),
      buildTutorialItem({
        id: 'delete-book',
        cardKey: 'delete_book',
        ctaPath: '/',
        video: {
          fileName: 'delete-book.mp4',
          posterFileName: 'delete-book.jpg',
          captionKey: 'videos.delete_book.caption',
          durationLabel: '00:15',
        },
      }),
      buildTutorialItem({
        id: 'scanner',
        cardKey: 'scanner',
        ctaPath: '/scanner',
        video: {
          fileName: 'scanner.mp4',
          posterFileName: 'scanner.jpg',
          captionKey: 'videos.scanner.caption',
          durationLabel: '00:25',
        },
      }),
      buildTutorialItem({
        id: 'assign-authors-categories',
        cardKey: 'assign_authors_categories',
        ctaPath: '/?mode=add',
        video: {
          fileName: 'assign-author-category.mp4',
          posterFileName: 'assign-author-category.jpg',
          captionKey: 'videos.assign_authors_categories.caption',
          durationLabel: '00:20',
        },
      }),
      buildTutorialItem({
        id: 'add-authors-categories',
        cardKey: 'add_authors_categories',
        ctaPath: '/?mode=add',
        video: {
          fileName: 'add-author-category.mp4',
          posterFileName: 'add-author-category.jpg',
          captionKey: 'videos.add_authors_categories.caption',
          durationLabel: '00:20',
        },
      }),
      buildTutorialItem({
        id: 'modify-delete-authors-categories',
        cardKey: 'modify_delete_authors_categories',
        ctaPath: '/?mode=add',
        video: {
          fileName: 'manage-author-category.mp4',
          posterFileName: 'manage-author-category.jpg',
          captionKey: 'videos.modify_delete_authors_categories.caption',
          durationLabel: '00:20',
        },
      }),
      buildTutorialItem({
        id: 'change-password',
        cardKey: 'change_password',
        ctaPath: '/account',
        video: {
          fileName: 'change-password.mp4',
          posterFileName: 'change-password.jpg',
          captionKey: 'videos.change_password.caption',
          durationLabel: '00:15',
        },
        availability: 'userPasswordFeature',
      }),
    ],
  },
];
