import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@my-many-books/shared-i18n';

// Configure i18next with HTTP backend for async translation loading
i18n
  .use(Backend) // Load translations asynchronously via HTTP
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    backend: {
      // Load translations from public folder
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      // Allow cross origin requests (for local development)
      crossDomain: false,
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),

    // Only load 'common' namespace initially for faster startup
    // Other namespaces will be loaded on-demand when needed
    ns: ['common'],
    defaultNS: 'common',

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'preferred-language',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: true, // Use React Suspense for async loading
    },

    // Load other namespaces on-demand
    partialBundledLanguages: true,

    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;
