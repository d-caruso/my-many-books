// Export shared i18n constants/types
export * from './types';

// Export i18n configuration and utilities
export {
  initializeI18n,
  changeLanguage,
  getCurrentLanguage,
  default as i18n,
} from './config';
