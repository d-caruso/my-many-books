import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@my-many-books/shared-i18n';

// Import translations from shared library
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

i18n
  .use(LanguageDetector)
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
      },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferred-language',
    },
    ns: ['common', 'validation', 'errors', 'books', 'scanner', 'pwa', 'dialogs', 'pages', 'theme', 'search'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;
