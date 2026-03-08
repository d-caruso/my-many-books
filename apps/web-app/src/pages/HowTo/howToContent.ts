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
  video?: TutorialVideoConfig;
  availability?: TutorialAvailability;
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

interface LibraryTutorialItemConfig {
  id: string;
  cardKey: string;
  ctaPath: string;
  mediaBaseName: string;
  durationLabel?: string;
  availability?: TutorialAvailability;
}

const buildLibraryTutorialItem = ({
  id,
  cardKey,
  ctaPath,
  mediaBaseName,
  durationLabel,
  availability,
}: LibraryTutorialItemConfig): TutorialItem =>
  buildTutorialItem({
    id,
    cardKey,
    ctaPath,
    video: {
      mediaBaseName,
      captionKey: `videos.${cardKey}.caption`,
      durationLabel,
    },
    availability,
  });

const LIBRARY_TUTORIAL_ITEM_CONFIGS: LibraryTutorialItemConfig[] = [
  {
    id: 'add-book',
    cardKey: 'add_book',
    ctaPath: '/?mode=add',
    mediaBaseName: 'add-book',
    durationLabel: '00:20',
  },
  {
    id: 'modify-book',
    cardKey: 'modify_book',
    ctaPath: '/',
    mediaBaseName: 'edit-book',
    durationLabel: '00:20',
  },
  {
    id: 'delete-book',
    cardKey: 'delete_book',
    ctaPath: '/',
    mediaBaseName: 'delete-book',
    durationLabel: '00:15',
  },
  {
    id: 'scanner',
    cardKey: 'scanner',
    ctaPath: '/scanner',
    mediaBaseName: 'scanner',
    durationLabel: '00:25',
  },
  {
    id: 'assign-authors-categories',
    cardKey: 'assign_authors_categories',
    ctaPath: '/?mode=add',
    mediaBaseName: 'assign-author-category',
    durationLabel: '00:20',
  },
  {
    id: 'add-authors-categories',
    cardKey: 'add_authors_categories',
    ctaPath: '/?mode=add',
    mediaBaseName: 'add-author-category',
    durationLabel: '00:20',
  },
  {
    id: 'modify-delete-authors-categories',
    cardKey: 'modify_delete_authors_categories',
    ctaPath: '/?mode=add',
    mediaBaseName: 'manage-author-category',
    durationLabel: '00:20',
  },
  {
    id: 'change-password',
    cardKey: 'change_password',
    ctaPath: '/account',
    mediaBaseName: 'change-password',
    durationLabel: '00:15',
    availability: 'userPasswordFeature',
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
