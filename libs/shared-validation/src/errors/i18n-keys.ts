/**
 * i18n Key Mappings
 *
 * Maps validation error codes to i18n translation keys.
 * These keys correspond to entries in shared-i18n/locales/{lang}/validation.json
 */

/**
 * Map error code to i18n key
 * This provides consistent translation keys across backend and frontend
 */
export const ERROR_CODE_TO_I18N_KEY: Record<string, string> = Object.freeze({
  // ISBN errors
  ISBN_REQUIRED: 'validation:isbn_required',
  INVALID_ISBN_LENGTH: 'validation:isbn_invalid',
  NO_VALID_ISBN_FOUND: 'validation:isbn_invalid',
  ISBN_10_INVALID_CHECKSUM: 'validation:isbn_invalid',
  ISBN_13_INVALID_CHECKSUM: 'validation:isbn_invalid',
  ISBN_13_INVALID_PREFIX: 'validation:isbn_invalid',
  ISBN_10_INVALID_FORMAT: 'validation:isbn_invalid',
  ISBN_13_INVALID_FORMAT: 'validation:isbn_invalid',

  // Book errors
  TITLE_REQUIRED: 'validation:book_title_required',
  TITLE_TOO_SHORT: 'validation:book_title_too_short',
  TITLE_TOO_LONG: 'validation:book_title_too_long',
  NOTES_TOO_LONG: 'validation:book_notes_too_long',
  INVALID_STATUS: 'validation:book_status_invalid',
  EDITION_NUMBER_INVALID: 'validation:book_edition_number_invalid',
  EDITION_DATE_INVALID: 'validation:book_edition_date_invalid',

  // Author errors
  NAME_REQUIRED: 'validation:author_name_required',
  NAME_TOO_SHORT: 'validation:author_name_too_short',
  NAME_TOO_LONG: 'validation:author_name_too_long',
  NAME_INVALID_CHARS: 'validation:author_name_invalid_chars',
  SURNAME_REQUIRED: 'validation:author_surname_required',
  SURNAME_TOO_SHORT: 'validation:author_surname_too_short',
  SURNAME_TOO_LONG: 'validation:author_surname_too_long',
  SURNAME_INVALID_CHARS: 'validation:author_surname_invalid_chars',
  NATIONALITY_TOO_LONG: 'validation:author_nationality_too_long',

  // Category errors
  CATEGORY_NAME_REQUIRED: 'validation:category_name_required',
  CATEGORY_NAME_TOO_SHORT: 'validation:category_name_too_short',
  CATEGORY_NAME_TOO_LONG: 'validation:category_name_too_long',
} as const);

/**
 * Get i18n key for an error code
 * @param errorCode - The error code from validation
 * @returns The i18n key, or a fallback key if not found
 */
export function getI18nKey(errorCode: string | undefined): string {
  if (!errorCode) {
    return 'validation:required'; // fallback
  }

  return ERROR_CODE_TO_I18N_KEY[errorCode] || 'validation:required';
}

/**
 * Type for validation error codes
 */
export type ValidationErrorCode = keyof typeof ERROR_CODE_TO_I18N_KEY;
