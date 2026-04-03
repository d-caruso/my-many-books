import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export type TutorialAvailability = 'always' | 'userPasswordFeature';

export interface TutorialVideo {
  src: string;
  poster?: string;
  captionKey: string;
  durationLabel?: string;
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
}

export interface TutorialSection {
  id: string;
  titleKey: string;
  items: TutorialItem[];
}

export interface TutorialCapabilities {
  userPasswordFeature: boolean;
}

export const CARD_ICON_NAMES: Partial<Record<string, MaterialIconName>> = {
  'add-book': 'library-add',
  'modify-book': 'edit',
  'delete-book': 'delete',
  'scanner': 'qr-code-scanner',
  'assign-authors-categories': 'person-add',
  'add-authors-categories': 'group-add',
  'modify-delete-authors-categories': 'manage-accounts',
  'change-password': 'lock',
};

const DEFAULT_STEPS_PER_CARD = 4;

const buildStepsKeys = (cardKey: string, count = DEFAULT_STEPS_PER_CARD): string[] =>
  Array.from({ length: count }, (_, i) => `cards.${cardKey}.step_${i + 1}`);

const isFeatureEnabled = (value: string | undefined): boolean =>
  String(value ?? '').toLowerCase() === 'true';

export const getTutorialCapabilities = (): TutorialCapabilities => ({
  userPasswordFeature: isFeatureEnabled(process.env.EXPO_PUBLIC_FEATURE_USER_PASSWORD),
});

export const isTutorialItemAvailable = (
  item: TutorialItem,
  capabilities: TutorialCapabilities
): boolean => {
  if (!item.availability || item.availability === 'always') return true;
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

const LIBRARY_ITEMS: TutorialItem[] = [
  {
    id: 'add-book',
    titleKey: 'cards.add_book.title',
    descriptionKey: 'cards.add_book.description',
    stepsKeys: buildStepsKeys('add_book'),
    ctaPath: '/book/add',
    ctaLabelKey: 'cta.add_book',
  },
  {
    id: 'modify-book',
    titleKey: 'cards.modify_book.title',
    descriptionKey: 'cards.modify_book.description',
    stepsKeys: buildStepsKeys('modify_book'),
    ctaPath: '/',
    ctaLabelKey: 'cta.go_to_library',
  },
  {
    id: 'delete-book',
    titleKey: 'cards.delete_book.title',
    descriptionKey: 'cards.delete_book.description',
    stepsKeys: buildStepsKeys('delete_book'),
    ctaPath: '/',
    ctaLabelKey: 'cta.go_to_library',
  },
  {
    id: 'scanner',
    titleKey: 'cards.scanner.title',
    descriptionKey: 'cards.scanner.description',
    stepsKeys: buildStepsKeys('scanner'),
    ctaPath: '/(tabs)/scanner',
    ctaLabelKey: 'cta.open_scanner',
  },
  {
    id: 'assign-authors-categories',
    titleKey: 'cards.assign_authors_categories.title',
    descriptionKey: 'cards.assign_authors_categories.description',
    stepsKeys: buildStepsKeys('assign_authors_categories'),
    ctaPath: '/book/add',
    ctaLabelKey: 'cta.add_book',
  },
  {
    id: 'add-authors-categories',
    titleKey: 'cards.add_authors_categories.title',
    descriptionKey: 'cards.add_authors_categories.description',
    stepsKeys: buildStepsKeys('add_authors_categories'),
    ctaPath: '/book/add',
    ctaLabelKey: 'cta.add_book',
  },
  {
    id: 'modify-delete-authors-categories',
    titleKey: 'cards.modify_delete_authors_categories.title',
    descriptionKey: 'cards.modify_delete_authors_categories.description',
    stepsKeys: buildStepsKeys('modify_delete_authors_categories'),
    ctaPath: '/book/add',
    ctaLabelKey: 'cta.add_book',
  },
  {
    id: 'change-password',
    titleKey: 'cards.change_password.title',
    descriptionKey: 'cards.change_password.description',
    stepsKeys: buildStepsKeys('change_password'),
    ctaPath: '/account',
    ctaLabelKey: 'cta.go_to_account',
    availability: 'userPasswordFeature',
  },
];

export const HOW_TO_SECTIONS: TutorialSection[] = [
  {
    id: 'library',
    titleKey: 'sections.library_workflows',
    items: LIBRARY_ITEMS,
  },
];
