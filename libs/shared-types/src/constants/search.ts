export const SEARCH_SORT_TYPES = Object.freeze({
  RELEVANCE: 'relevance',
  FIELD: 'field',
} as const);

export type SearchSortType =
  typeof SEARCH_SORT_TYPES[keyof typeof SEARCH_SORT_TYPES];

export const SEARCH_SORT_BY_FIELDS = Object.freeze({
  TITLE: 'title',
  AUTHOR: 'author',
  STATUS: 'status',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
} as const);

export const SEARCH_SORT_BY_FIELD_VALUES = Object.freeze(
  Object.values(SEARCH_SORT_BY_FIELDS)
);

export type SearchSortByField =
  typeof SEARCH_SORT_BY_FIELD_VALUES[number];

export const SEARCH_RESULT_STATUS = Object.freeze({
  PINNED: 'pinned',
  REGULAR: 'regular',
} as const);

export type SearchResultStatus =
  typeof SEARCH_RESULT_STATUS[keyof typeof SEARCH_RESULT_STATUS];
