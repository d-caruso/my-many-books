import { PASSWORD_RULE_PATTERNS, PASSWORD_RULE_TYPES, type PasswordRuleType } from '@my-many-books/shared-types';
import { PASSWORD_CONSTRAINTS, PASSWORD_ERROR_MESSAGES } from '../constants/auth.constants';
import { getI18nKey } from '../errors/i18n-keys';
import { ValidationResult } from '../types/validation.types';

type PasswordValidationErrorCode =
  | 'PASSWORD_REQUIRED'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_TOO_LONG'
  | 'PASSWORD_MISSING_UPPERCASE'
  | 'PASSWORD_MISSING_LOWERCASE'
  | 'PASSWORD_MISSING_NUMBER'
  | 'PASSWORD_MISSING_SYMBOL'
  | 'CONFIRM_PASSWORD_REQUIRED'
  | 'PASSWORD_MISMATCH';

export interface PasswordStrengthValidationResult extends ValidationResult<string> {
  metadata?: {
    failedRules: PasswordRuleType[];
  };
}

const REQUIRED_RULES = Object.freeze({
  uppercase: PASSWORD_CONSTRAINTS.REQUIRE_UPPERCASE,
  lowercase: PASSWORD_CONSTRAINTS.REQUIRE_LOWERCASE,
  numbers: PASSWORD_CONSTRAINTS.REQUIRE_NUMBERS,
  symbols: PASSWORD_CONSTRAINTS.REQUIRE_SYMBOLS,
} as const);

const RULE_ERROR_MAP: Record<PasswordRuleType, { code: PasswordValidationErrorCode; message: string }> = {
  uppercase: {
    code: 'PASSWORD_MISSING_UPPERCASE',
    message: PASSWORD_ERROR_MESSAGES.MISSING_UPPERCASE,
  },
  lowercase: {
    code: 'PASSWORD_MISSING_LOWERCASE',
    message: PASSWORD_ERROR_MESSAGES.MISSING_LOWERCASE,
  },
  numbers: {
    code: 'PASSWORD_MISSING_NUMBER',
    message: PASSWORD_ERROR_MESSAGES.MISSING_NUMBER,
  },
  symbols: {
    code: 'PASSWORD_MISSING_SYMBOL',
    message: PASSWORD_ERROR_MESSAGES.MISSING_SYMBOL,
  },
};

const buildErrorResult = (
  code: PasswordValidationErrorCode,
  error: string,
  failedRules: PasswordRuleType[] = []
): PasswordStrengthValidationResult => ({
  isValid: false,
  error,
  errorCode: code,
  i18nKey: getI18nKey(code),
  metadata: { failedRules },
});

export function getRequiredPasswordRuleTypes(): PasswordRuleType[] {
  return PASSWORD_RULE_TYPES.filter((rule) => REQUIRED_RULES[rule]);
}

export function validatePasswordStrength(password: string): PasswordStrengthValidationResult {
  if (!password.trim()) {
    return buildErrorResult('PASSWORD_REQUIRED', PASSWORD_ERROR_MESSAGES.REQUIRED);
  }

  if (password.length < PASSWORD_CONSTRAINTS.MIN_LENGTH) {
    return buildErrorResult('PASSWORD_TOO_SHORT', PASSWORD_ERROR_MESSAGES.TOO_SHORT);
  }

  if (password.length > PASSWORD_CONSTRAINTS.MAX_LENGTH) {
    return buildErrorResult('PASSWORD_TOO_LONG', PASSWORD_ERROR_MESSAGES.TOO_LONG);
  }

  const failedRules = getRequiredPasswordRuleTypes().filter(
    (rule) => !PASSWORD_RULE_PATTERNS[rule].test(password)
  );

  if (failedRules.length === 0) {
    return { isValid: true, metadata: { failedRules } };
  }

  const firstRule = failedRules[0];
  if (!firstRule) {
    return { isValid: true, metadata: { failedRules } };
  }
  const firstRuleError = RULE_ERROR_MAP[firstRule];
  return buildErrorResult(firstRuleError.code, firstRuleError.message, failedRules);
}

export function isPasswordStrong(password: string): boolean {
  return validatePasswordStrength(password).isValid;
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): ValidationResult {
  if (!confirmPassword.trim()) {
    return {
      isValid: false,
      error: PASSWORD_ERROR_MESSAGES.CONFIRM_PASSWORD_REQUIRED,
      errorCode: 'CONFIRM_PASSWORD_REQUIRED',
      i18nKey: getI18nKey('CONFIRM_PASSWORD_REQUIRED'),
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: PASSWORD_ERROR_MESSAGES.MISMATCH,
      errorCode: 'PASSWORD_MISMATCH',
      i18nKey: getI18nKey('PASSWORD_MISMATCH'),
    };
  }

  return { isValid: true };
}
