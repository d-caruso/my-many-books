export const SEARCH_RESULT_STATUS = Object.freeze({
  PINNED: 'pinned',
  REGULAR: 'regular',
} as const);

export type SearchResultStatus = typeof SEARCH_RESULT_STATUS[keyof typeof SEARCH_RESULT_STATUS];
