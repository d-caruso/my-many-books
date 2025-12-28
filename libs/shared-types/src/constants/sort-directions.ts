export const SORT_DIRECTIONS = Object.freeze({
  ASC: 'asc',
  DESC: 'desc',
} as const);

export const SORT_DIRECTION_VALUES = Object.freeze(
  Object.values(SORT_DIRECTIONS)
);

export type SortDirection = typeof SORT_DIRECTION_VALUES[number];
