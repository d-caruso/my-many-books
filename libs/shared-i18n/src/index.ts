// Export types
export {
  SupportedLanguage,
  TranslationNamespace,
  type LanguageMetadata,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
} from './types';

// Export i18n configuration and utilities
export {
  initializeI18n,
  changeLanguage,
  getCurrentLanguage,
  default as i18n,
} from './config';
