import { ENTITY_MANAGE_ERROR_CODES } from '@my-many-books/shared-types';
import { mapAuthorManageApiError, mapCategoryManageApiError } from '../index';

describe('entityManagementErrors', () => {
  it('maps author delete has-books conflict to specific code and i18n key', () => {
    const error = {
      response: {
        status: 409,
        data: { error: 'AUTHOR_HAS_BOOKS', message: 'In use' },
      },
    };

    const mapped = mapAuthorManageApiError(error, 'delete');

    expect(mapped.code).toBe(ENTITY_MANAGE_ERROR_CODES.HAS_BOOKS);
    expect(mapped.i18nKey).toBe('dialogs:author.delete_blocked_has_books');
    expect(mapped.status).toBe(409);
    expect(mapped.backendError).toBe('AUTHOR_HAS_BOOKS');
  });

  it('maps category delete has-books conflict to specific code and i18n key', () => {
    const error = {
      response: {
        status: 409,
        data: { error: 'CATEGORY_HAS_BOOKS', message: 'In use' },
      },
    };

    const mapped = mapCategoryManageApiError(error, 'delete');

    expect(mapped.code).toBe(ENTITY_MANAGE_ERROR_CODES.HAS_BOOKS);
    expect(mapped.i18nKey).toBe('dialogs:category.delete_blocked_has_books');
  });

  it('maps unknown author update error to generic failure key', () => {
    const mapped = mapAuthorManageApiError(new Error('boom'), 'update');

    expect(mapped.code).toBe(ENTITY_MANAGE_ERROR_CODES.UNKNOWN);
    expect(mapped.i18nKey).toBe('dialogs:author.update_failed');
    expect(mapped.message).toBe('boom');
  });
});
