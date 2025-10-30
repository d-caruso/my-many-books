/**
 * Supported language codes following ISO 639-1 standard
 */
export enum SupportedLanguage {
  EN = 'en',
  IT = 'it',
  // Future languages (add here when implemented):
  // DE = 'de',  // German
  // ES = 'es',  // Spanish
  // FR = 'fr',  // French
}

/**
 * Language metadata for UI display
 */
export interface LanguageMetadata {
  code: string;
  name: string;        // English name
  nativeName: string;  // Name in native language
}

/**
 * List of all supported languages with metadata
 * Add new languages here when implementing them
 */
export const SUPPORTED_LANGUAGES: LanguageMetadata[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  // Future languages:
  // { code: 'de', name: 'German', nativeName: 'Deutsch' },
  // { code: 'es', name: 'Spanish', nativeName: 'Español' },
  // { code: 'fr', name: 'French', nativeName: 'Français' },
];

/**
 * Default fallback language
 */
export const DEFAULT_LANGUAGE = SupportedLanguage.EN;

/**
 * Translation namespace keys
 */
export enum TranslationNamespace {
  COMMON = 'common',
  VALIDATION = 'validation',
  ERRORS = 'errors',
  BOOKS = 'books',
  AUTH = 'auth',
}
