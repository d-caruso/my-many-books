import i18n from 'i18next';
import { DEFAULT_LANGUAGE, TranslationNamespace } from './types';

// Import all translation files
import enCommon from './locales/en/common.json';
import enValidation from './locales/en/validation.json';
import enErrors from './locales/en/errors.json';
import enBooks from './locales/en/books.json';
import enAdmin from './locales/en/pages.json';
import enHooks from './locales/en/hooks.json';
import enDialogs from './locales/en/dialogs.json';
import enSearch from './locales/en/search.json';

import itCommon from './locales/it/common.json';
import itValidation from './locales/it/validation.json';
import itErrors from './locales/it/errors.json';
import itBooks from './locales/it/books.json';
import itAdmin from './locales/it/pages.json';
import itHooks from './locales/it/hooks.json';
import itDialogs from './locales/it/dialogs.json';
import itSearch from './locales/it/search.json';

/**
 * Initialize i18next with all translations
 * This should be called once at app startup
 */
export const initializeI18n = async (language?: string) => {
  await i18n.init({
    lng: language || DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    debug: false, // Disable i18next debug logging

    // Namespaces
    ns: [
      TranslationNamespace.COMMON,
      TranslationNamespace.VALIDATION,
      TranslationNamespace.ERRORS,
      TranslationNamespace.BOOKS,
      TranslationNamespace.ADMIN,
      TranslationNamespace.HOOKS,
      TranslationNamespace.DIALOGS,
      TranslationNamespace.SEARCH,
    ],
    defaultNS: TranslationNamespace.COMMON,

    // Resources
    resources: {
      en: {
        [TranslationNamespace.COMMON]: enCommon,
        [TranslationNamespace.VALIDATION]: enValidation,
        [TranslationNamespace.ERRORS]: enErrors,
        [TranslationNamespace.BOOKS]: enBooks,
        [TranslationNamespace.ADMIN]: enAdmin,
        [TranslationNamespace.HOOKS]: enHooks,
        [TranslationNamespace.DIALOGS]: enDialogs,
        [TranslationNamespace.SEARCH]: enSearch,
      },
      it: {
        [TranslationNamespace.COMMON]: itCommon,
        [TranslationNamespace.VALIDATION]: itValidation,
        [TranslationNamespace.ERRORS]: itErrors,
        [TranslationNamespace.BOOKS]: itBooks,
        [TranslationNamespace.ADMIN]: itAdmin,
        [TranslationNamespace.HOOKS]: itHooks,
        [TranslationNamespace.DIALOGS]: itDialogs,
        [TranslationNamespace.SEARCH]: itSearch,
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
