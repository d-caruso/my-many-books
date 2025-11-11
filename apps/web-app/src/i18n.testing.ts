import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@my-many-books/shared-i18n';

// Import translations synchronously for tests
// (HTTP backend doesn't work in test environment without a server)
import enCommon from '@my-many-books/shared-i18n/src/locales/en/common.json';
import enValidation from '@my-many-books/shared-i18n/src/locales/en/validation.json';
import enErrors from '@my-many-books/shared-i18n/src/locales/en/errors.json';
import enBooks from '@my-many-books/shared-i18n/src/locales/en/books.json';
import enScanner from '@my-many-books/shared-i18n/src/locales/en/scanner.json';
import enPwa from '@my-many-books/shared-i18n/src/locales/en/pwa.json';
import enDialogs from '@my-many-books/shared-i18n/src/locales/en/dialogs.json';
import enPages from '@my-many-books/shared-i18n/src/locales/en/pages.json';
import enTheme from '@my-many-books/shared-i18n/src/locales/en/theme.json';
import enSearch from '@my-many-books/shared-i18n/src/locales/en/search.json';
import enAccessibility from '@my-many-books/shared-i18n/src/locales/en/accessibility.json';

import itCommon from '@my-many-books/shared-i18n/src/locales/it/common.json';
import itValidation from '@my-many-books/shared-i18n/src/locales/it/validation.json';
import itErrors from '@my-many-books/shared-i18n/src/locales/it/errors.json';
import itBooks from '@my-many-books/shared-i18n/src/locales/it/books.json';
import itScanner from '@my-many-books/shared-i18n/src/locales/it/scanner.json';
import itPwa from '@my-many-books/shared-i18n/src/locales/it/pwa.json';
import itDialogs from '@my-many-books/shared-i18n/src/locales/it/dialogs.json';
import itPages from '@my-many-books/shared-i18n/src/locales/it/pages.json';
import itTheme from '@my-many-books/shared-i18n/src/locales/it/theme.json';
import itSearch from '@my-many-books/shared-i18n/src/locales/it/search.json';
import itAccessibility from '@my-many-books/shared-i18n/src/locales/it/accessibility.json';

// Configure i18next for tests with synchronous translations
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        validation: enValidation,
        errors: enErrors,
        books: enBooks,
        scanner: enScanner,
        pwa: enPwa,
        dialogs: enDialogs,
        pages: enPages,
        theme: enTheme,
        search: enSearch,
        accessibility: enAccessibility,
      },
      it: {
        common: itCommon,
        validation: itValidation,
        errors: itErrors,
        books: itBooks,
        scanner: itScanner,
        pwa: itPwa,
        dialogs: itDialogs,
        pages: itPages,
        theme: itTheme,
        search: itSearch,
        accessibility: itAccessibility,
      },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    ns: ['common', 'validation', 'errors', 'books', 'scanner', 'pwa', 'dialogs', 'pages', 'theme', 'search', 'accessibility'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false, // Disable Suspense for tests
    },
    debug: false,
  });

export default i18n;
