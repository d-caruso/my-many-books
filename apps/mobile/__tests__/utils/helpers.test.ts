import {
  formatDate,
  generateBookId,
  sanitizeSearchQuery,
  groupBooksByStatus,
} from '@/utils/helpers';
import { Book } from '@/types';

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
      expect(formatDate(null as string)).toBe('Invalid Date');
      expect(formatDate(undefined as string)).toBe('Invalid Date');
    });
  });

  describe('generateBookId', () => {
    it('should generate unique book IDs', () => {
      const id1 = generateBookId();
      const id2 = generateBookId();
      
      expect(id1).toMatch(/^book_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^book_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should sanitize search queries', () => {
      expect(sanitizeSearchQuery('  Hello World!  ')).toBe('hello world');
      expect(sanitizeSearchQuery('Test@#$%Query')).toBe('testquery');
      expect(sanitizeSearchQuery('Multiple   Spaces')).toBe('multiple spaces');
    });

    it('should handle empty/invalid input', () => {
      expect(sanitizeSearchQuery('')).toBe('');
      expect(sanitizeSearchQuery(null as string)).toBe('');
      expect(sanitizeSearchQuery(undefined as string)).toBe('');
    });
  });

  describe('groupBooksByStatus', () => {
    it('should group books by status', () => {
      const books: Book[] = [
        { id: 1, title: 'Book 1', status: 'reading', authors: [], categories: [], creationDate: '2023-01-01', updateDate: '2023-01-01', isbnCode: '123' },
        { id: 2, title: 'Book 2', status: 'finished', authors: [], categories: [], creationDate: '2023-01-01', updateDate: '2023-01-01', isbnCode: '456' },
        { id: 3, title: 'Book 3', status: 'reading', authors: [], categories: [], creationDate: '2023-01-01', updateDate: '2023-01-01', isbnCode: '789' },
      ];

      const grouped = groupBooksByStatus(books);

      expect(grouped.reading).toHaveLength(2);
      expect(grouped.finished).toHaveLength(1);
      expect(grouped.reading[0].title).toBe('Book 1');
    });
  });
});
