export const SEARCH_SORT_TYPES = Object.freeze({
  RELEVANCE: 'relevance',
  FIELD: 'field',
} as const);

export type SearchSortType = typeof SEARCH_SORT_TYPES[keyof typeof SEARCH_SORT_TYPES];
