import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@my-many-books/shared-i18n';

// Import translations from shared library
import enCommon from '@my-many-books/shared-i18n/src/locales/en/common.json';
import enValidation from '@my-many-books/shared-i18n/src/locales/en/validation.json';
import enErrors from '@my-many-books/shared-i18n/src/locales/en/errors.json';
import enBooks from '@my-many-books/shared-i18n/src/locales/en/books.json';

import itCommon from '@my-many-books/shared-i18n/src/locales/it/common.json';
import itValidation from '@my-many-books/shared-i18n/src/locales/it/validation.json';
import itErrors from '@my-many-books/shared-i18n/src/locales/it/errors.json';
import itBooks from '@my-many-books/shared-i18n/src/locales/it/books.json';

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
      },
      it: {
        common: itCommon,
        validation: itValidation,
        errors: itErrors,
        books: itBooks,
      },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferred-language',
    },
    ns: ['common', 'validation', 'errors', 'books'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;
