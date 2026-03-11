import { formatEditionDate } from '../editionDate';

describe('formatEditionDate', () => {
  it('should return empty string for null/undefined/empty', () => {
    expect(formatEditionDate(null)).toBe('');
    expect(formatEditionDate(undefined)).toBe('');
    expect(formatEditionDate('')).toBe('');
  });

  it('should return year as-is for YYYY format', () => {
    expect(formatEditionDate('2024')).toBe('2024');
    expect(formatEditionDate('1900')).toBe('1900');
  });

  it('should format YYYY-MM as MM/YYYY', () => {
    expect(formatEditionDate('2024-03')).toBe('03/2024');
    expect(formatEditionDate('2024-12')).toBe('12/2024');
  });

  it('should format YYYY-MM-DD as DD/MM/YYYY', () => {
    expect(formatEditionDate('2024-03-15')).toBe('15/03/2024');
    expect(formatEditionDate('2023-01-01')).toBe('01/01/2023');
  });
});
