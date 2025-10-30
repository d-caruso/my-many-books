import i18n from 'i18next';
import { DEFAULT_LANGUAGE, TranslationNamespace } from './types';

// Import all translation files
import enCommon from './locales/en/common.json';
import enValidation from './locales/en/validation.json';
import enErrors from './locales/en/errors.json';
import enBooks from './locales/en/books.json';

import itCommon from './locales/it/common.json';
import itValidation from './locales/it/validation.json';
import itErrors from './locales/it/errors.json';
import itBooks from './locales/it/books.json';

/**
 * Initialize i18next with all translations
 * This should be called once at app startup
 */
export const initializeI18n = async (language?: string) => {
  await i18n.init({
    lng: language || DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    debug: process.env.NODE_ENV === 'development',

    // Namespaces
    ns: [
      TranslationNamespace.COMMON,
      TranslationNamespace.VALIDATION,
      TranslationNamespace.ERRORS,
      TranslationNamespace.BOOKS,
    ],
    defaultNS: TranslationNamespace.COMMON,

    // Resources
    resources: {
      en: {
        [TranslationNamespace.COMMON]: enCommon,
        [TranslationNamespace.VALIDATION]: enValidation,
        [TranslationNamespace.ERRORS]: enErrors,
        [TranslationNamespace.BOOKS]: enBooks,
      },
      it: {
        [TranslationNamespace.COMMON]: itCommon,
        [TranslationNamespace.VALIDATION]: itValidation,
        [TranslationNamespace.ERRORS]: itErrors,
        [TranslationNamespace.BOOKS]: itBooks,
      },
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Pluralization
    pluralSeparator: '_',
  });

  return i18n;
};

/**
 * Change the current language
 */
export const changeLanguage = async (language: string) => {
  await i18n.changeLanguage(language);
};

/**
 * Get the current language
 */
export const getCurrentLanguage = () => {
  return i18n.language || DEFAULT_LANGUAGE;
};

export default i18n;
