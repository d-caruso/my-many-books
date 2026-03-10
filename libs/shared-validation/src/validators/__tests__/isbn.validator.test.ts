/**
 * ISBN Validator Tests
 *
 * Comprehensive test suite for ISBN validation logic
 */

import {
  validateIsbn,
  validateIsbn10Checksum,
  validateIsbn13Checksum,
  convertIsbn10ToIsbn13,
  formatIsbnForDisplay,
  isLikelyIsbn,
  extractIsbn,
  isValidIsbnFormat,
} from '../isbn.validator';

describe('validateIsbn', () => {
  describe('ISBN-13 validation', () => {
    it('should validate correct ISBN-13', () => {
      const result = validateIsbn('978-0-439-42089-1');
      expect(result.isValid).toBe(true);
      expect(result.normalizedIsbn).toBe('9780439420891');
      expect(result.format).toBe('ISBN-13');
    });

    it('should validate ISBN-13 without hyphens', () => {
      const result = validateIsbn('9780439420891');
      expect(result.isValid).toBe(true);
      expect(result.normalizedIsbn).toBe('9780439420891');
    });

    it('should validate ISBN-13 with spaces', () => {
      const result = validateIsbn('978 0 439 42089 1');
      expect(result.isValid).toBe(true);
      expect(result.normalizedIsbn).toBe('9780439420891');
    });

    it('should reject ISBN-13 with invalid checksum', () => {
      const result = validateIsbn('9780439420895'); // Wrong checksum
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('checksum');
    });

    it('should reject ISBN-13 with invalid prefix', () => {
      const result = validateIsbn('9770439420894'); // Starts with 977
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('978 or 979');
    });
  });

  describe('ISBN-10 validation', () => {
    it('should validate correct ISBN-10 and convert to ISBN-13', () => {
      const result = validateIsbn('0-439-42089-X');
      expect(result.isValid).toBe(true);
      expect(result.normalizedIsbn).toBe('9780439420891');
      expect(result.format).toBe('ISBN-10');
    });

    it('should validate ISBN-10 with X checksum', () => {
      const result = validateIsbn('043942089X');
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('ISBN-10');
    });

    it('should validate ISBN-10 with lowercase x', () => {
      const result = validateIsbn('043942089x');
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('ISBN-10');
    });

    it('should reject ISBN-10 with invalid checksum', () => {
      const result = validateIsbn('0439420891'); // Wrong checksum
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('checksum');
    });

    it('should reject ISBN-10 with non-digit in first 9 chars', () => {
      const result = validateIsbn('043X420890');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('digits');
    });
  });

  describe('edge cases', () => {
    it('should reject empty string', () => {
      const result = validateIsbn('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject null/undefined', () => {
      const result = validateIsbn(null as unknown as string);
      expect(result.isValid).toBe(false);
    });

    it('should reject invalid length', () => {
      const result = validateIsbn('12345');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('length');
    });

    it('should reject non-ISBN characters', () => {
      const result = validateIsbn('ABC-DEF-GHI-JK');
      expect(result.isValid).toBe(false);
    });
  });
});

describe('validateIsbn10Checksum', () => {
  it('should validate correct ISBN-10 checksum', () => {
    expect(validateIsbn10Checksum('043942089X')).toBe(true);
  });

  it('should validate ISBN-10 with X checksum', () => {
    expect(validateIsbn10Checksum('043942089X')).toBe(true);
  });

  it('should reject invalid checksum', () => {
    expect(validateIsbn10Checksum('0439420891')).toBe(false);
  });

  it('should reject wrong length', () => {
    expect(validateIsbn10Checksum('12345')).toBe(false);
  });
});

describe('validateIsbn13Checksum', () => {
  it('should validate correct ISBN-13 checksum', () => {
    expect(validateIsbn13Checksum('9780439420891')).toBe(true);
  });

  it('should reject invalid checksum', () => {
    expect(validateIsbn13Checksum('9780439420895')).toBe(false);
  });

  it('should reject wrong length', () => {
    expect(validateIsbn13Checksum('12345')).toBe(false);
  });
});

describe('convertIsbn10ToIsbn13', () => {
  it('should convert ISBN-10 to ISBN-13', () => {
    const result = convertIsbn10ToIsbn13('043942089X');
    expect(result).toBe('9780439420891');
  });

  it('should convert ISBN-10 with X to ISBN-13', () => {
    const isbn13 = convertIsbn10ToIsbn13('043942089X');
    expect(isbn13.length).toBe(13);
    expect(isbn13.startsWith('978')).toBe(true);
  });

  it('should throw error for invalid length', () => {
    expect(() => convertIsbn10ToIsbn13('12345')).toThrow();
  });
});

describe('formatIsbnForDisplay', () => {
  it('should format ISBN-13 with hyphens', () => {
    const result = formatIsbnForDisplay('9780439420891');
    expect(result).toBe('978-0-439-42089-1');
  });

  it('should return original if invalid', () => {
    const invalid = 'invalid-isbn';
    const result = formatIsbnForDisplay(invalid);
    expect(result).toBe(invalid);
  });
});

describe('isLikelyIsbn', () => {
  it('should return true for likely ISBN-10', () => {
    expect(isLikelyIsbn('0-439-42089-0')).toBe(true);
  });

  it('should return true for likely ISBN-13', () => {
    expect(isLikelyIsbn('978-0-439-42089-4')).toBe(true);
  });

  it('should return false for wrong length', () => {
    expect(isLikelyIsbn('12345')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isLikelyIsbn('')).toBe(false);
  });
});

describe('extractIsbn', () => {
  it('should extract ISBN-13 from text', () => {
    const text = 'The book ISBN is 9780439420891 and...';
    const result = extractIsbn(text);
    expect(result).toBe('9780439420891');
  });

  it('should extract ISBN-10 from text', () => {
    const text = 'ISBN: 043942089X for this book';
    const result = extractIsbn(text);
    expect(result).toBeTruthy();
  });

  it('should return null if no ISBN found', () => {
    const result = extractIsbn('No ISBN in this text');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = extractIsbn('');
    expect(result).toBeNull();
  });
});

describe('isValidIsbnFormat', () => {
  it('should return true for valid ISBN-10 format', () => {
    expect(isValidIsbnFormat('043942089X')).toBe(true);
  });

  it('should return true for valid ISBN-13 format', () => {
    expect(isValidIsbnFormat('9780439420894')).toBe(true);
  });

  it('should return true even with hyphens', () => {
    expect(isValidIsbnFormat('978-0-439-42089-4')).toBe(true);
  });

  it('should return false for invalid format', () => {
    expect(isValidIsbnFormat('ABC123')).toBe(false);
  });

  it('should return false for wrong length', () => {
    expect(isValidIsbnFormat('12345')).toBe(false);
  });
});

describe('Real-world ISBN examples', () => {
  const validIsbns = [
    { input: '978-0-13-468599-1', format: 'ISBN-13', name: 'Clean Code' },
    { input: '978-0-596-00848-2', format: 'ISBN-13', name: 'Programming Perl' },
    { input: '0-439-42089-X', format: 'ISBN-10', name: 'Harry Potter (ISBN-10)' },
    { input: '978-0-7475-3269-9', format: 'ISBN-13', name: 'Harry Potter (ISBN-13)' },
  ];

  validIsbns.forEach(({ input, format, name }) => {
    it(`should validate ${name} (${format})`, () => {
      const result = validateIsbn(input);
      expect(result.isValid).toBe(true);
      expect(result.format).toBe(format);
    });
  });
});
