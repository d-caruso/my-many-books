import { capitalizeFirst, formatDate, formatDateTime, formatFullName, slugify, truncateText } from '../formatting';

describe('formatting utilities', () => {
  test('formatDate uses Date.toLocaleDateString for strings and Date objects', () => {
    const spy = jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('DATE');

    expect(formatDate('2020-01-01')).toBe('DATE');
    expect(formatDate(new Date('2020-01-02'))).toBe('DATE');
    expect(spy).toHaveBeenCalledTimes(2);

    spy.mockRestore();
  });

  test('formatDateTime uses Date.toLocaleString for strings and Date objects', () => {
    const spy = jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('DATETIME');

    expect(formatDateTime('2020-01-01T10:00:00Z')).toBe('DATETIME');
    expect(formatDateTime(new Date('2020-01-02T10:00:00Z'))).toBe('DATETIME');
    expect(spy).toHaveBeenCalledTimes(2);

    spy.mockRestore();
  });

  test('truncateText truncates with ellipsis when necessary', () => {
    expect(truncateText('abc', 3)).toBe('abc');
    expect(truncateText('abcd', 3)).toBe('...');
    expect(truncateText('abcdefgh', 6)).toBe('abc...');
  });

  test('capitalizeFirst handles empty strings and normalizes casing', () => {
    expect(capitalizeFirst('')).toBe('');
    expect(capitalizeFirst('hello')).toBe('Hello');
    expect(capitalizeFirst('hELLO')).toBe('Hello');
  });

  test('formatFullName trims inputs and avoids extra spaces', () => {
    expect(formatFullName('  A  ', '  B  ')).toBe('A B');
    expect(formatFullName('A', '')).toBe('A');
  });

  test('slugify creates URL-friendly slugs', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('  Hello,   World!! ')).toBe('hello-world');
    expect(slugify('Already-a-slug')).toBe('already-a-slug');
  });
});

