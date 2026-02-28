/**
 * SQLite column name constants for sort and query operations
 */
export const DB_SORT_FIELDS = Object.freeze({
  TITLE: 'title',
  UPDATE_DATE: 'update_date',
  CREATION_DATE: 'creation_date',
} as const);

export type DbSortField = typeof DB_SORT_FIELDS[keyof typeof DB_SORT_FIELDS];
