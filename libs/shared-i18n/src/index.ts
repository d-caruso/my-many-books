// Export shared i18n constants/types
export * from './types';

// Export i18n configuration and utilities
export {
  initializeI18n,
  changeLanguage,
  getCurrentLanguage,
  default as i18n,
} from './config';

// Export locale resources for use in tests
export { default as enCommon } from './locales/en/common.json';
export { default as enDialogs } from './locales/en/dialogs.json';
