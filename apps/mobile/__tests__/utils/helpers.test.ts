import { formatDate, getStatusLabel, getStatusColor, validateISBN, truncateText } from '@/utils/helpers';

describe('Helper Utilities', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = '2023-01-15T10:30:00.000Z';
      const formatted = formatDate(date);
      
      expect(formatted).toBe('Jan 15, 2023');
    });

    it('should handle invalid dates', () => {
      const invalidDate = 'invalid-date';
      const formatted = formatDate(invalidDate);
      
      expect(formatted).toBe('Invalid Date');
    });

    it('should handle null/undefined dates', () => {
      expect(formatDate(null as any)).toBe('Invalid Date');
      expect(formatDate(undefined as any)).toBe('Invalid Date');
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct labels for all statuses', () => {
      expect(getStatusLabel('want-to-read')).toBe('Want to Read');
      expect(getStatusLabel('reading')).toBe('Reading');
      expect(getStatusLabel('completed')).toBe('Completed');
    });

    it('should handle unknown status', () => {
      expect(getStatusLabel('unknown' as any)).toBe('Unknown');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for all statuses', () => {
      expect(getStatusColor('want-to-read')).toBe('#2196F3');
      expect(getStatusColor('reading')).toBe('#FF9800');
      expect(getStatusColor('completed')).toBe('#4CAF50');
    });

    it('should handle unknown status', () => {
      expect(getStatusColor('unknown' as any)).toBe('#757575');
    });
  });

  describe('validateISBN', () => {
    it('should validate correct ISBN-10', () => {
      expect(validateISBN('0134685997')).toBe(true);
      expect(validateISBN('0-13-468599-7')).toBe(true);
    });

    it('should validate correct ISBN-13', () => {
      expect(validateISBN('9780134685991')).toBe(true);
      expect(validateISBN('978-0-13-468599-1')).toBe(true);
    });

    it('should reject invalid ISBNs', () => {
      expect(validateISBN('123')).toBe(false);
      expect(validateISBN('1234567890123')).toBe(false);
      expect(validateISBN('invalid-isbn')).toBe(false);
      expect(validateISBN('')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(validateISBN(null as any)).toBe(false);
      expect(validateISBN(undefined as any)).toBe(false);
    });
  });

  describe('truncateText', () => {
    it('should truncate text longer than limit', () => {
      const longText = 'This is a very long text that should be truncated';
      const truncated = truncateText(longText, 20);
      
      expect(truncated).toBe('This is a very long ...');
      expect(truncated.length).toBeLessThanOrEqual(23); // 20 + '...' = 23
    });

    it('should not truncate text shorter than limit', () => {
      const shortText = 'Short text';
      const result = truncateText(shortText, 20);
      
      expect(result).toBe('Short text');
    });

    it('should handle exact length', () => {
      const exactText = 'Exactly twenty chars';
      const result = truncateText(exactText, 20);
      
      expect(result).toBe('Exactly twenty chars');
    });

    it('should handle empty text', () => {
      expect(truncateText('', 10)).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(truncateText(null as any, 10)).toBe('');
      expect(truncateText(undefined as any, 10)).toBe('');
    });

    it('should handle very small limits', () => {
      const text = 'Hello world';
      expect(truncateText(text, 1)).toBe('H...');
      expect(truncateText(text, 0)).toBe('...');
    });
  });
});
