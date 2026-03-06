import {
  getRequiredPasswordRuleTypes,
  isPasswordStrong,
  validatePasswordConfirmation,
  validatePasswordStrength,
} from '../password.validator';

describe('password.validator', () => {
  it('returns required rules from shared policy', () => {
    expect(getRequiredPasswordRuleTypes()).toEqual(['uppercase', 'lowercase', 'numbers']);
  });

  it('validates strong passwords', () => {
    expect(validatePasswordStrength('StrongPass123').isValid).toBe(true);
    expect(isPasswordStrong('StrongPass123')).toBe(true);
  });

  it('rejects empty password', () => {
    const result = validatePasswordStrength('');
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe('PASSWORD_REQUIRED');
    expect(result.i18nKey).toBe('validation:password_required');
  });

  it('rejects short password', () => {
    const result = validatePasswordStrength('Aa1');
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe('PASSWORD_TOO_SHORT');
    expect(result.i18nKey).toBe('validation:password_too_short');
  });

  it('rejects password with missing required rule', () => {
    const result = validatePasswordStrength('lowercase123');
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe('PASSWORD_MISSING_UPPERCASE');
    expect(result.metadata?.failedRules).toContain('uppercase');
  });

  it('validates matching confirmation', () => {
    expect(validatePasswordConfirmation('StrongPass123', 'StrongPass123').isValid).toBe(true);
  });

  it('rejects empty confirmation', () => {
    const result = validatePasswordConfirmation('StrongPass123', '');
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe('CONFIRM_PASSWORD_REQUIRED');
  });

  it('rejects mismatched confirmation', () => {
    const result = validatePasswordConfirmation('StrongPass123', 'StrongPass124');
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe('PASSWORD_MISMATCH');
    expect(result.i18nKey).toBe('validation:passwords_dont_match');
  });
});
