import {
  validateISBN,
  formatISBN,
  convertISBN10to13,
  normalizeISBN,
  isValidEmail,
  isValidUrl,
  sanitizeString,
  isNotEmpty,
  validateMinLength,
  validateMaxLength,
  formatDate,
  formatDateTime,
  truncateText,
  capitalizeFirst,
  formatFullName,
  slugify,
} from '../../utils/index';

describe('Utils Index - Re-exports', () => {
  describe('ISBN utilities', () => {
    test('validateISBN is exported and functional', () => {
      expect(validateISBN).toBeDefined();
      const result = validateISBN('9780123456786');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('ISBN-13');
    });

    test('formatISBN is exported and functional', () => {
      expect(formatISBN).toBeDefined();
      const result = formatISBN('9780123456786');
      expect(result).toBe('978-0-12345-678-6');
    });

    test('convertISBN10to13 is exported and functional', () => {
      expect(convertISBN10to13).toBeDefined();
      const result = convertISBN10to13('0123456789');
      expect(result).toBe('9780123456786');
    });

    test('normalizeISBN is exported and functional', () => {
      expect(normalizeISBN).toBeDefined();
      const result = normalizeISBN('978-0-123-45678-6');
      expect(result).toBe('9780123456786');
    });
  });

  describe('Validation utilities', () => {
    test('isValidEmail is exported and functional', () => {
      expect(isValidEmail).toBeDefined();
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
    });

    test('isValidUrl is exported and functional', () => {
      expect(isValidUrl).toBeDefined();
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('invalid-url')).toBe(false);
    });

    test('sanitizeString is exported and functional', () => {
      expect(sanitizeString).toBeDefined();
      const result = sanitizeString('<script>alert("xss")</script>Hello');
      expect(result).not.toContain('<script>');
    });

    test('isNotEmpty is exported and functional', () => {
      expect(isNotEmpty).toBeDefined();
      expect(isNotEmpty('hello')).toBe(true);
      expect(isNotEmpty('')).toBe(false);
      expect(isNotEmpty('   ')).toBe(false);
    });

    test('validateMinLength is exported and functional', () => {
      expect(validateMinLength).toBeDefined();
      expect(validateMinLength('hello', 3)).toBe(true);
      expect(validateMinLength('hi', 3)).toBe(false);
    });

    test('validateMaxLength is exported and functional', () => {
      expect(validateMaxLength).toBeDefined();
      expect(validateMaxLength('hello', 10)).toBe(true);
      expect(validateMaxLength('hello world', 5)).toBe(false);
    });
  });

  describe('Formatting utilities', () => {
    test('formatDate is exported and functional', () => {
      expect(formatDate).toBeDefined();
      const date = new Date('2023-12-25');
      const result = formatDate(date);
      expect(result).toContain('2023'); // Should contain year
      expect(result).toContain('25'); // Should contain day
    });

    test('formatDateTime is exported and functional', () => {
      expect(formatDateTime).toBeDefined();
      const date = new Date('2023-12-25T10:30:00');
      const result = formatDateTime(date);
      expect(result).toContain('2023'); // Should contain year
      expect(result).toMatch(/10:30/); // Should contain time
    });

    test('truncateText is exported and functional', () => {
      expect(truncateText).toBeDefined();
      const result = truncateText('This is a long text', 10);
      expect(result.length).toBeLessThanOrEqual(13); // 10 + '...'
      expect(result).toContain('...');
    });

    test('capitalizeFirst is exported and functional', () => {
      expect(capitalizeFirst).toBeDefined();
      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('world')).toBe('World');
    });

    test('formatFullName is exported and functional', () => {
      expect(formatFullName).toBeDefined();
      const result = formatFullName('john', 'doe');
      expect(result).toContain('john');
      expect(result).toContain('doe');
    });

    test('slugify is exported and functional', () => {
      expect(slugify).toBeDefined();
      expect(slugify('Hello World!')).toBe('hello-world');
      expect(slugify('Test & Demo')).toBe('test-demo');
    });
  });

  describe('Module structure', () => {
    test('all functions are exported', () => {
      // ISBN functions
      expect(validateISBN).toBeInstanceOf(Function);
      expect(formatISBN).toBeInstanceOf(Function);
      expect(convertISBN10to13).toBeInstanceOf(Function);
      expect(normalizeISBN).toBeInstanceOf(Function);
      
      // Validation functions
      expect(isValidEmail).toBeInstanceOf(Function);
      expect(isValidUrl).toBeInstanceOf(Function);
      expect(sanitizeString).toBeInstanceOf(Function);
      expect(isNotEmpty).toBeInstanceOf(Function);
      expect(validateMinLength).toBeInstanceOf(Function);
      expect(validateMaxLength).toBeInstanceOf(Function);
      
      // Formatting functions
      expect(formatDate).toBeInstanceOf(Function);
      expect(formatDateTime).toBeInstanceOf(Function);
      expect(truncateText).toBeInstanceOf(Function);
      expect(capitalizeFirst).toBeInstanceOf(Function);
      expect(formatFullName).toBeInstanceOf(Function);
      expect(slugify).toBeInstanceOf(Function);
    });
  });
});