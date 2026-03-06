import {
  PASSWORD_POLICY as SHARED_PASSWORD_POLICY,
  PASSWORD_RULE_PATTERNS,
} from '@my-many-books/shared-types';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
}

export type PasswordRuleType = 'uppercase' | 'lowercase' | 'numbers' | 'symbols';
export type PasswordValidationRule = 'minLength' | PasswordRuleType;

export interface PasswordValidationResult {
  isValid: boolean;
  failedRules: PasswordValidationRule[];
}

export const PASSWORD_POLICY: PasswordPolicy = {
  minLength: SHARED_PASSWORD_POLICY.MIN_LENGTH,
  requireUppercase: SHARED_PASSWORD_POLICY.REQUIRE_UPPERCASE,
  requireLowercase: SHARED_PASSWORD_POLICY.REQUIRE_LOWERCASE,
  requireNumbers: SHARED_PASSWORD_POLICY.REQUIRE_NUMBERS,
  requireSymbols: SHARED_PASSWORD_POLICY.REQUIRE_SYMBOLS,
};

export const getRequiredPasswordRuleTypes = (
  policy: PasswordPolicy = PASSWORD_POLICY
): PasswordRuleType[] => {
  const requiredRules: PasswordRuleType[] = [];

  if (policy.requireUppercase) requiredRules.push('uppercase');
  if (policy.requireLowercase) requiredRules.push('lowercase');
  if (policy.requireNumbers) requiredRules.push('numbers');
  if (policy.requireSymbols) requiredRules.push('symbols');

  return requiredRules;
};

export const validatePasswordAgainstPolicy = (
  password: string,
  policy: PasswordPolicy = PASSWORD_POLICY
): PasswordValidationResult => {
  const failedRules: PasswordValidationRule[] = [];

  if (password.length < policy.minLength) {
    failedRules.push('minLength');
  }

  for (const rule of getRequiredPasswordRuleTypes(policy)) {
    if (!PASSWORD_RULE_PATTERNS[rule].test(password)) {
      failedRules.push(rule);
    }
  }

  return {
    isValid: failedRules.length === 0,
    failedRules,
  };
};

export const isPasswordCompliant = (
  password: string,
  policy: PasswordPolicy = PASSWORD_POLICY
): boolean => validatePasswordAgainstPolicy(password, policy).isValid;

export const formatLocalizedList = (items: string[], locale: string): string => {
  if (items.length <= 1) {
    return items.join('');
  }

  const IntlWithListFormat = Intl as typeof Intl & {
    ListFormat?: new (
      locales?: string | string[],
      options?: { style?: 'long' | 'short' | 'narrow'; type?: 'conjunction' | 'disjunction' | 'unit' }
    ) => { format(values: string[]): string };
  };

  if (typeof Intl !== 'undefined' && typeof IntlWithListFormat.ListFormat === 'function') {
    return new IntlWithListFormat.ListFormat(locale, {
      style: 'long',
      type: 'conjunction',
    }).format(items);
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};
