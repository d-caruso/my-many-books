/**
 * String Utility Functions Tests
 */

import {
  normalizeIsbn,
  removeWhitespace,
  normalizeUppercase,
  trim,
  isEmpty,
  isNumeric,
  toString,
  truncate,
} from '../string.utils';

describe('string.utils', () => {
  describe('normalizeIsbn', () => {
    it('should remove hyphens and spaces', () => {
      expect(normalizeIsbn('978-0-451-52493-5')).toBe('9780451524935');
      expect(normalizeIsbn('978 0 451 52493 5')).toBe('9780451524935');
    });

    it('should convert to uppercase', () => {
      expect(normalizeIsbn('043942089x')).toBe('043942089X');
    });

    it('should handle edge cases', () => {
      expect(normalizeIsbn('')).toBe('');
      expect(normalizeIsbn(null as any)).toBe('');
      expect(normalizeIsbn(undefined as any)).toBe('');
    });
  });

  describe('removeWhitespace', () => {
    it('should remove all whitespace', () => {
      expect(removeWhitespace('hello world')).toBe('helloworld');
      expect(removeWhitespace('  a  b  c  ')).toBe('abc');
      expect(removeWhitespace('test\n\t\rstring')).toBe('teststring');
    });

    it('should handle strings without whitespace', () => {
      expect(removeWhitespace('helloworld')).toBe('helloworld');
    });

    it('should handle edge cases', () => {
      expect(removeWhitespace('')).toBe('');
      expect(removeWhitespace(null as any)).toBe('');
      expect(removeWhitespace(undefined as any)).toBe('');
      expect(removeWhitespace(123 as any)).toBe('');
    });
  });

  describe('normalizeUppercase', () => {
    it('should trim and convert to uppercase', () => {
      expect(normalizeUppercase('  hello  ')).toBe('HELLO');
      expect(normalizeUppercase('world')).toBe('WORLD');
      expect(normalizeUppercase('  TeSt  ')).toBe('TEST');
    });

    it('should handle edge cases', () => {
      expect(normalizeUppercase('')).toBe('');
      expect(normalizeUppercase(null as any)).toBe('');
      expect(normalizeUppercase(undefined as any)).toBe('');
      expect(normalizeUppercase(123 as any)).toBe('');
    });
  });

  describe('trim', () => {
    it('should trim leading and trailing whitespace', () => {
      expect(trim('  hello  ')).toBe('hello');
      expect(trim('\n\tworld\n\t')).toBe('world');
      expect(trim('  test')).toBe('test');
      expect(trim('test  ')).toBe('test');
    });

    it('should handle strings without whitespace', () => {
      expect(trim('hello')).toBe('hello');
    });

    it('should handle edge cases', () => {
      expect(trim('')).toBe('');
      expect(trim(null as any)).toBe('');
      expect(trim(undefined as any)).toBe('');
      expect(trim(123 as any)).toBe('');
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty strings', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty('\n\t')).toBe(true);
    });

    it('should return true for null/undefined', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return false for non-empty strings', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty('  hello  ')).toBe(false);
      expect(isEmpty('0')).toBe(false);
    });
  });

  describe('isNumeric', () => {
    it('should return true for numeric strings', () => {
      expect(isNumeric('123')).toBe(true);
      expect(isNumeric('0')).toBe(true);
      expect(isNumeric('999999')).toBe(true);
    });

    it('should return false for non-numeric strings', () => {
      expect(isNumeric('abc')).toBe(false);
      expect(isNumeric('12a34')).toBe(false);
      expect(isNumeric('12.34')).toBe(false);
      expect(isNumeric('12-34')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isNumeric('')).toBe(false);
      expect(isNumeric(null as any)).toBe(false);
      expect(isNumeric(undefined as any)).toBe(false);
      expect(isNumeric(123 as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should convert values to strings', () => {
      expect(toString('hello')).toBe('hello');
      expect(toString(123)).toBe('123');
      expect(toString(true)).toBe('true');
      expect(toString(false)).toBe('false');
    });

    it('should handle objects', () => {
      expect(toString({ foo: 'bar' })).toBe('{"foo":"bar"}');
      expect(toString([1, 2, 3])).toBe('[1,2,3]');
    });

    it('should handle null/undefined', () => {
      expect(toString(null)).toBe('');
      expect(toString(undefined)).toBe('');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('hello world', 8)).toBe('hello...');
      expect(truncate('this is a long string', 10)).toBe('this is...');
    });

    it('should use custom suffix', () => {
      expect(truncate('hello world', 8, '…')).toBe('hello w…');
      expect(truncate('hello world', 8, ' [more]')).toBe('h [more]');
    });

    it('should not truncate short strings', () => {
      expect(truncate('hello', 10)).toBe('hello');
      expect(truncate('test', 4)).toBe('test');
    });

    it('should handle edge cases', () => {
      expect(truncate('', 10)).toBe('');
      expect(truncate(null as any, 10)).toBe(null);
      expect(truncate(undefined as any, 10)).toBe(undefined);
    });

    it('should handle exact length', () => {
      expect(truncate('hello', 5)).toBe('hello');
      expect(truncate('hello!', 6)).toBe('hello!');
    });
  });
});
