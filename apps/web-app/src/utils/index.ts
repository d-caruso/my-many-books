/**
 * Utility functions for the web app.
 *
 * Most utilities are re-exported from the shared monorepo package so all apps
 * stay in sync. Web-only utilities (like i18n error translation) live here.
 */

export * from '@my-many-books/shared-utils';

export { translateApiError, getErrorCode, getErrorDetails } from './errorTranslation';
