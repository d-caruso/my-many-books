import type { TFunction } from 'i18next';

/**
 * Resolves a validation result's i18n key or fallback message into a localized string.
 * Used with validation results from shared-validation (e.g. validatePasswordStrength).
 */
export const resolveValidationError = (
  t: TFunction,
  i18nKey: string | undefined,
  fallbackMessage: string | undefined,
): string => {
  if (i18nKey) {
    return t(i18nKey, { defaultValue: fallbackMessage });
  }

  if (fallbackMessage) {
    return fallbackMessage;
  }

  return t('common:unexpected_error');
};
