/**
 * Field name constants for consistent API responses
 */

export const USER_RESPONSE_FIELDS = Object.freeze({
  FULL_NAME: 'fullName',
  CREATED_AT: 'createdAt', 
  UPDATED_AT: 'updatedAt',
} as const);

export const DATABASE_FIELDS = Object.freeze({
  CREATION_DATE: 'creationDate',
  UPDATE_DATE: 'updateDate',
} as const);