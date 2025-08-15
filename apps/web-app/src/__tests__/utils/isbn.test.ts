import { validateISBN, formatISBN, convertISBN10to13, normalizeISBN } from '../../utils/isbn';

describe('ISBN Utilities', () => {
  describe('validateISBN', () => {
    test('validates correct ISBN-10', () => {
      const result = validateISBN('0123456789');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('ISBN-10');
    });

    test('validates correct ISBN-10 with X check digit', () => {
      // Use a real ISBN-10 with X check digit: 080442957X
      const result = validateISBN('080442957X');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('ISBN-10');
    });

    test('validates correct ISBN-13', () => {
      const result = validateISBN('9780123456786');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('ISBN-13');
    });

    test('validates formatted ISBN with dashes', () => {
      const result = validateISBN('978-0-123-45678-6');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('ISBN-13');
    });

    test('rejects invalid ISBN-10', () => {
      const result = validateISBN('0123456788');
      expect(result.isValid).toBe(false);
      expect(result.type).toBe('ISBN-10');
    });

    test('rejects invalid ISBN-13', () => {
      const result = validateISBN('9780123456787');
      expect(result.isValid).toBe(false);
      expect(result.type).toBe('ISBN-13');
    });

    test('rejects ISBN with wrong length', () => {
      const result = validateISBN('123456');
      expect(result.isValid).toBe(false);
      expect(result.type).toBe(null);
    });

    test('handles empty string', () => {
      const result = validateISBN('');
      expect(result.isValid).toBe(false);
      expect(result.type).toBe(null);
    });

    test('handles spaces and special characters', () => {
      const result = validateISBN('978 0 123 456 78 6');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('ISBN-13');
    });
  });

  describe('formatISBN', () => {
    test('formats ISBN-10 correctly', () => {
      const formatted = formatISBN('0123456789');
      expect(formatted).toBe('0-12345-678-9');
    });

    test('formats ISBN-13 correctly', () => {
      const formatted = formatISBN('9780123456786');
      expect(formatted).toBe('978-0-12345-678-6');
    });

    test('formats ISBN-10 with X check digit', () => {
      const formatted = formatISBN('080442957X');
      expect(formatted).toBe('0-80442-957-X');
    });

    test('returns original string for invalid length', () => {
      const input = '12345';
      const formatted = formatISBN(input);
      expect(formatted).toBe(input);
    });

    test('handles already formatted ISBN', () => {
      const input = '978-0-123-45678-6';
      const formatted = formatISBN(input);
      expect(formatted).toBe('978-0-12345-678-6');
    });
  });

  describe('convertISBN10to13', () => {
    test('converts valid ISBN-10 to ISBN-13', () => {
      const isbn13 = convertISBN10to13('0123456789');
      expect(isbn13).toBe('9780123456786');
    });

    test('converts ISBN-10 with X check digit', () => {
      const isbn13 = convertISBN10to13('080442957X');
      expect(isbn13).toBe('9780804429573');
    });

    test('returns null for invalid ISBN-10', () => {
      const isbn13 = convertISBN10to13('0123456788');
      expect(isbn13).toBe(null);
    });

    test('returns null for wrong length', () => {
      const isbn13 = convertISBN10to13('123456');
      expect(isbn13).toBe(null);
    });

    test('handles formatted ISBN-10', () => {
      const isbn13 = convertISBN10to13('0-12345-678-9');
      expect(isbn13).toBe('9780123456786');
    });
  });

  describe('normalizeISBN', () => {
    test('removes dashes and spaces', () => {
      const normalized = normalizeISBN('978-0-123-45678-6');
      expect(normalized).toBe('9780123456786');
    });

    test('removes spaces', () => {
      const normalized = normalizeISBN('978 0 123 456 786');
      expect(normalized).toBe('9780123456786');
    });

    test('preserves X check digit', () => {
      const normalized = normalizeISBN('012-345-678-x');
      expect(normalized).toBe('012345678X');
    });

    test('handles mixed formatting', () => {
      const normalized = normalizeISBN('978-0 123.456/786');
      expect(normalized).toBe('9780123456786');
    });

    test('returns empty string for empty input', () => {
      const normalized = normalizeISBN('');
      expect(normalized).toBe('');
    });
  });
});