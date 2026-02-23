import {
  PASSWORD_POLICY,
  formatLocalizedList,
  getRequiredPasswordRuleTypes,
  isPasswordCompliant,
  validatePasswordAgainstPolicy,
} from '../passwordPolicy';

describe('passwordPolicy', () => {
  it('exposes the expected default policy', () => {
    expect(PASSWORD_POLICY).toEqual({
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: false,
    });
  });

  it('returns required rule types from policy booleans', () => {
    expect(getRequiredPasswordRuleTypes()).toEqual(['uppercase', 'lowercase', 'numbers']);
  });

  it('validates a compliant password', () => {
    const result = validatePasswordAgainstPolicy('Abcdef12');

    expect(result.isValid).toBe(true);
    expect(result.failedRules).toEqual([]);
    expect(isPasswordCompliant('Abcdef12')).toBe(true);
  });

  it('fails short password', () => {
    const result = validatePasswordAgainstPolicy('Abc12');

    expect(result.isValid).toBe(false);
    expect(result.failedRules).toContain('minLength');
  });

  it('fails missing uppercase, lowercase and numbers', () => {
    expect(validatePasswordAgainstPolicy('abcdefgh').failedRules).toContain('uppercase');
    expect(validatePasswordAgainstPolicy('ABCDEFGH').failedRules).toContain('lowercase');
    expect(validatePasswordAgainstPolicy('Abcdefgh').failedRules).toContain('numbers');
  });

  it('accepts passwords without symbols when symbols are not required', () => {
    expect(isPasswordCompliant('Abcdef12')).toBe(true);
  });

  it('formats localized lists with Intl.ListFormat when available', () => {
    const list = ['uppercase', 'lowercase', 'numbers'];
    const formatted = formatLocalizedList(list, 'en');

    expect(formatted).toContain('uppercase');
    expect(formatted).toContain('lowercase');
    expect(formatted).toContain('numbers');
  });
});
