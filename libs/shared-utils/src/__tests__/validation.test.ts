import {
  isNotEmpty,
  isValidEmail,
  isValidUrl,
  sanitizeString,
  validateMaxLength,
  validateMinLength,
} from '../validation';

describe('validation utilities', () => {
  test('isValidEmail validates basic email formats', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });

  test('isValidUrl validates URLs using URL constructor', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000/path?q=1')).toBe(true);
    expect(isValidUrl('notaurl')).toBe(false);
    expect(isValidUrl('://bad')).toBe(false);
  });

  test('sanitizeString trims and removes angle brackets', () => {
    expect(sanitizeString('  <script>hi</script>  ')).toBe('scripthi/script');
    expect(sanitizeString('hello')).toBe('hello');
  });

  test('isNotEmpty checks for non-empty trimmed strings', () => {
    expect(isNotEmpty('a')).toBe(true);
    expect(isNotEmpty('  a  ')).toBe(true);
    expect(isNotEmpty('')).toBe(false);
    expect(isNotEmpty('   ')).toBe(false);
    expect(isNotEmpty(null)).toBe(false);
    expect(isNotEmpty(undefined)).toBe(false);
  });

  test('validateMinLength and validateMaxLength enforce length constraints', () => {
    expect(validateMinLength('abc', 3)).toBe(true);
    expect(validateMinLength('ab', 3)).toBe(false);
    expect(validateMaxLength('abc', 3)).toBe(true);
    expect(validateMaxLength('abcd', 3)).toBe(false);
  });
});

