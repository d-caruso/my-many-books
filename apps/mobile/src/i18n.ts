import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@my-many-books/shared-i18n';

// Import translations from shared library
import enCommon from '@my-many-books/shared-i18n/src/locales/en/common.json';
import enValidation from '@my-many-books/shared-i18n/src/locales/en/validation.json';
import enErrors from '@my-many-books/shared-i18n/src/locales/en/errors.json';
import enBooks from '@my-many-books/shared-i18n/src/locales/en/books.json';
import enScanner from '@my-many-books/shared-i18n/src/locales/en/scanner.json';

import itCommon from '@my-many-books/shared-i18n/src/locales/it/common.json';
import itValidation from '@my-many-books/shared-i18n/src/locales/it/validation.json';
import itErrors from '@my-many-books/shared-i18n/src/locales/it/errors.json';
import itBooks from '@my-many-books/shared-i18n/src/locales/it/books.json';
import itScanner from '@my-many-books/shared-i18n/src/locales/it/scanner.json';

// AsyncStorage key for language preference
const LANGUAGE_STORAGE_KEY = '@language-preference';

/**
 * Get the initial language with priority:
 * 1. AsyncStorage preference
 * 2. Device language
 * 3. Default language (English)
 */
const getInitialLanguage = async (): Promise<string> => {
  try {
    // Priority 1: Check AsyncStorage for saved preference
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && SUPPORTED_LANGUAGES.some((l) => l.code === savedLanguage)) {
      return savedLanguage;
    }

    // Priority 2: Use device language
    const deviceLanguage = Localization.getLocales()[0]?.languageCode;
    if (deviceLanguage && SUPPORTED_LANGUAGES.some((l) => l.code === deviceLanguage)) {
      return deviceLanguage;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting initial language:', error);
  }

  // Priority 3: Fall back to default language
  return DEFAULT_LANGUAGE;
};

/**
 * Save language preference to AsyncStorage
 */
export const saveLanguagePreference = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error saving language preference:', error);
  }
};

/**
 * Change language and persist to AsyncStorage
 */
export const changeLanguage = async (language: string): Promise<void> => {
  await i18n.changeLanguage(language);
  await saveLanguagePreference(language);
};

// Initialize i18n
const initializeI18n = async () => {
  const initialLanguage = await getInitialLanguage();

  i18n.use(initReactI18next);

  await i18n.init({
    resources: {
      en: {
        common: enCommon,
        validation: enValidation,
        errors: enErrors,
        books: enBooks,
        scanner: enScanner,
      },
      it: {
        common: itCommon,
        validation: itValidation,
        errors: itErrors,
        books: itBooks,
        scanner: itScanner,
      },
    },
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    ns: ['common', 'validation', 'errors', 'books', 'scanner'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React Native already escapes values
    },
    react: {
      useSuspense: false, // Important for React Native
    },
    compatibilityJSON: 'v4', // Important for i18next v21+
  });
};

// Start initialization
initializeI18n();

export default i18n;
