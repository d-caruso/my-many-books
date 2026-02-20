import { convertISBN10to13, formatISBN, normalizeISBN, validateISBN } from '../isbn';

describe('ISBN utilities', () => {
  test('validateISBN validates ISBN-10 and ISBN-13', () => {
    expect(validateISBN('0-306-40615-2')).toEqual({ isValid: true, type: 'ISBN-10' });
    expect(validateISBN('978-0-306-40615-7')).toEqual({ isValid: true, type: 'ISBN-13' });
  });

  test('validateISBN handles X check digits for ISBN-10', () => {
    expect(validateISBN('0-8044-2957-X')).toEqual({ isValid: true, type: 'ISBN-10' });
    expect(validateISBN('080442957X')).toEqual({ isValid: true, type: 'ISBN-10' });
  });

  test('validateISBN rejects invalid values', () => {
    expect(validateISBN('')).toEqual({ isValid: false, type: null });
    expect(validateISBN('123')).toEqual({ isValid: false, type: null });
    expect(validateISBN('0-306-40615-3')).toEqual({ isValid: false, type: 'ISBN-10' });
    expect(validateISBN('978-0-306-40615-8')).toEqual({ isValid: false, type: 'ISBN-13' });
  });

  test('validateISBN rejects non-ISBN EAN-13 (no 978/979 prefix)', () => {
    // Valid EAN-13 checksum but not a Bookland ISBN
    expect(validateISBN('5477148210281')).toEqual({ isValid: false, type: 'ISBN-13' });
    expect(validateISBN('4006381333931')).toEqual({ isValid: false, type: 'ISBN-13' });
  });

  test('formatISBN formats normalized ISBN strings', () => {
    expect(formatISBN('0306406152')).toBe('0-30640-615-2');
    expect(formatISBN('9780306406157')).toBe('978-0-30640-615-7');
  });

  test('formatISBN preserves original input for unsupported lengths', () => {
    expect(formatISBN('not-an-isbn')).toBe('not-an-isbn');
    expect(formatISBN('123456789')).toBe('123456789');
  });

  test('convertISBN10to13 converts valid ISBN-10 and rejects invalid', () => {
    expect(convertISBN10to13('0-306-40615-2')).toBe('9780306406157');
    expect(convertISBN10to13('0-306-40615-3')).toBeNull();
    expect(convertISBN10to13('123')).toBeNull();
  });

  test('normalizeISBN strips non-digit characters and uppercases X', () => {
    expect(normalizeISBN(' 0-8044-2957-x ')).toBe('080442957X');
    expect(normalizeISBN('978-0-306-40615-7')).toBe('9780306406157');
  });
});

