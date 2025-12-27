export const RESOURCE_TYPES = Object.freeze({
  BOOK: 'book',
  AUTHOR: 'author',
  CATEGORY: 'category',
  USER: 'user',
  HOOK: 'hook',
} as const);

export const RESOURCE_TYPE_VALUES = Object.freeze(
  Object.values(RESOURCE_TYPES)
) as readonly (typeof RESOURCE_TYPES[keyof typeof RESOURCE_TYPES])[];

export type ResourceType = typeof RESOURCE_TYPE_VALUES[number];
