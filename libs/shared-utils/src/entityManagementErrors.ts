import {
  AUTHOR_DELETE_CONFLICT_REASONS,
  CATEGORY_DELETE_CONFLICT_REASONS,
  ENTITY_MANAGE_ERROR_CODES,
  EntityManageOperationError,
} from '@my-many-books/shared-types';
import { extractErrorDetails } from './errorExtraction';

const buildError = (
  code: EntityManageOperationError['code'],
  i18nKey: string,
  details: ReturnType<typeof extractErrorDetails>
): EntityManageOperationError => ({
  code,
  i18nKey,
  message: details.message,
  status: details.status,
  backendError: details.backendError,
});

export const mapAuthorManageApiError = (
  error: unknown,
  operation: 'load' | 'create' | 'update' | 'delete'
): EntityManageOperationError => {
  const details = extractErrorDetails(error);

  if (operation === 'delete' && details.backendError === AUTHOR_DELETE_CONFLICT_REASONS.HAS_BOOKS) {
    return buildError(ENTITY_MANAGE_ERROR_CODES.HAS_BOOKS, 'dialogs:author.delete_blocked_has_books', details);
  }

  if (details.status === 404) {
    return buildError(ENTITY_MANAGE_ERROR_CODES.NOT_FOUND, `dialogs:author.${operation}_failed`, details);
  }
  if (details.status === 403) {
    return buildError(ENTITY_MANAGE_ERROR_CODES.FORBIDDEN, `dialogs:author.${operation}_failed`, details);
  }
  if (details.status === 409) {
    return buildError(ENTITY_MANAGE_ERROR_CODES.CONFLICT, `dialogs:author.${operation}_failed`, details);
  }

  return buildError(ENTITY_MANAGE_ERROR_CODES.UNKNOWN, `dialogs:author.${operation}_failed`, details);
};

export const mapCategoryManageApiError = (
  error: unknown,
  operation: 'load' | 'create' | 'update' | 'delete'
): EntityManageOperationError => {
  const details = extractErrorDetails(error);

  if (operation === 'delete' && details.backendError === CATEGORY_DELETE_CONFLICT_REASONS.HAS_BOOKS) {
    return buildError(
      ENTITY_MANAGE_ERROR_CODES.HAS_BOOKS,
      'dialogs:category.delete_blocked_has_books',
      details
    );
  }

  if (details.status === 404) {
    return buildError(ENTITY_MANAGE_ERROR_CODES.NOT_FOUND, `dialogs:category.${operation}_failed`, details);
  }
  if (details.status === 403) {
    return buildError(ENTITY_MANAGE_ERROR_CODES.FORBIDDEN, `dialogs:category.${operation}_failed`, details);
  }
  if (details.status === 409) {
    return buildError(ENTITY_MANAGE_ERROR_CODES.CONFLICT, `dialogs:category.${operation}_failed`, details);
  }

  return buildError(ENTITY_MANAGE_ERROR_CODES.UNKNOWN, `dialogs:category.${operation}_failed`, details);
};
