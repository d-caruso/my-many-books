import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@my-many-books/shared-i18n';

// Import translations from shared library
import enCommon from '@my-many-books/shared-i18n/src/locales/en/common.json';
import enValidation from '@my-many-books/shared-i18n/src/locales/en/validation.json';
import enErrors from '@my-many-books/shared-i18n/src/locales/en/errors.json';
import enBooks from '@my-many-books/shared-i18n/src/locales/en/books.json';
import enAuth from '@my-many-books/shared-i18n/src/locales/en/auth.json';

import itCommon from '@my-many-books/shared-i18n/src/locales/it/common.json';
import itValidation from '@my-many-books/shared-i18n/src/locales/it/validation.json';
import itErrors from '@my-many-books/shared-i18n/src/locales/it/errors.json';
import itBooks from '@my-many-books/shared-i18n/src/locales/it/books.json';
import itAuth from '@my-many-books/shared-i18n/src/locales/it/auth.json';

// Get device language
const deviceLanguage = Localization.getLocales()[0]?.languageCode || DEFAULT_LANGUAGE;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        validation: enValidation,
        errors: enErrors,
        books: enBooks,
        auth: enAuth,
      },
      it: {
        common: itCommon,
        validation: itValidation,
        errors: itErrors,
        books: itBooks,
        auth: itAuth,
      },
    },
    lng: deviceLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    ns: ['common', 'validation', 'errors', 'books', 'auth'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React Native already escapes values
    },
    react: {
      useSuspense: false, // Important for React Native
    },
    compatibilityJSON: 'v3', // Important for i18next v21+
  });

export default i18n;
