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
      loadPath: (lngs: string[], namespaces: string[]) => {
        // Only load for the first language (current), not fallback
        const lng = lngs[0];
        const ns = namespaces[0];
        return `/locales/${lng}/${ns}.json`;
      },
      // Allow cross origin requests (for local development)
      crossDomain: false,
      // Request options for better caching
      requestOptions: {
        cache: 'default', // Use browser cache
      },
      // Only load for current language, skip fallback language in backend
      allowMultiLoading: false,
    },
    fallbackLng: DEFAULT_LANGUAGE, // Keep fallback for missing keys, but don't load files
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),

    // Load critical namespaces upfront (preloaded in HTML for parallel loading)
    // These are needed immediately on app startup: common, pages, books, search
    // search is included because BookSearchForm renders on BooksPage (default landing page)
    // Other namespaces (scanner, admin, dialogs) will be loaded on-demand
    ns: ['common', 'pages', 'books', 'search'],
    defaultNS: 'common',

    // Prevent preloading all languages - only load detected language
    preload: false,

    // Load languages on demand
    load: 'currentOnly', // Only load the current language, not fallback

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
      // Bind i18n instance to Suspense for better loading states
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added',
    },

    // Load other namespaces on-demand
    partialBundledLanguages: true,

    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;
