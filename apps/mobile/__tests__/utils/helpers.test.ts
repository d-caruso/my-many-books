import {
  formatDate,
  getStatusLabel,
  getStatusColor,
  truncateText,
  generateBookId,
  sanitizeSearchQuery,
  groupBooksByStatus,
  sortBooks,
  filterBooks,
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

  describe('getStatusLabel', () => {
    it('should return correct labels for all statuses', () => {
      expect(getStatusLabel('reading')).toBe('Reading');
      expect(getStatusLabel('paused')).toBe('Paused');
      expect(getStatusLabel('finished')).toBe('Finished');
    });

    it('should handle unknown status', () => {
      expect(getStatusLabel('unknown' as 'reading' | 'paused' | 'finished')).toBe('Unknown');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for all statuses', () => {
      expect(getStatusColor('reading')).toBe('#FF9800');
      expect(getStatusColor('paused')).toBe('#2196F3');
      expect(getStatusColor('finished')).toBe('#4CAF50');
    });

    it('should handle unknown status', () => {
      expect(getStatusColor('unknown' as 'reading' | 'paused' | 'finished')).toBe('#757575');
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
      expect(truncateText(null as string, 10)).toBe('');
      expect(truncateText(undefined as string, 10)).toBe('');
    });

    it('should handle very small limits', () => {
      const text = 'Hello world';
      expect(truncateText(text, 1)).toBe('H...');
      expect(truncateText(text, 0)).toBe('...');
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

  describe('sortBooks', () => {
    const mockBooks: Book[] = [
      { id: 1, title: 'Zebra Book', authors: [{ id: 1, name: 'Alpha', surname: 'Author' }], creationDate: '2023-01-01', status: 'reading', categories: [], updateDate: '2023-01-01', isbnCode: '123' },
      { id: 2, title: 'Alpha Book', authors: [{ id: 2, name: 'Zeta', surname: 'Author' }], creationDate: '2023-01-02', status: 'finished', categories: [], updateDate: '2023-01-02', isbnCode: '456' },
    ];

    it('should sort books by title', () => {
      const sorted = sortBooks(mockBooks, 'title');
      expect(sorted[0].title).toBe('Alpha Book');
      expect(sorted[1].title).toBe('Zebra Book');
    });

    it('should sort books by author', () => {
      const sorted = sortBooks(mockBooks, 'author');
      expect(sorted[0].authors[0].name).toBe('Alpha');
      expect(sorted[1].authors[0].name).toBe('Zeta');
    });

    it('should sort books by date', () => {
      const sorted = sortBooks(mockBooks, 'date');
      expect(sorted[0].creationDate).toBe('2023-01-02');
      expect(sorted[1].creationDate).toBe('2023-01-01');
    });
  });

  describe('filterBooks', () => {
    const mockBooks: Book[] = [
      {
        id: 1,
        title: 'Book 1',
        status: 'reading',
        authors: [{ id: 1, name: 'John', surname: 'Doe' }],
        categories: [{ id: 1, name: 'Fiction' }],
        creationDate: '2023-01-01',
        updateDate: '2023-01-01',
        isbnCode: '123'
      },
      {
        id: 2,
        title: 'Book 2',
        status: 'finished',
        authors: [{ id: 2, name: 'Jane', surname: 'Smith' }],
        categories: [{ id: 2, name: 'Non-Fiction' }],
        creationDate: '2023-01-02',
        updateDate: '2023-01-02',
        isbnCode: '456'
      },
    ];

    it('should filter books by status', () => {
      const filtered = filterBooks(mockBooks, { status: 'reading' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('reading');
    });

    it('should filter books by category', () => {
      const filtered = filterBooks(mockBooks, { category: 'Fiction' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].categories[0].name).toBe('Fiction');
    });

    it('should filter books by author', () => {
      const filtered = filterBooks(mockBooks, { author: 'john' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].authors[0].name).toBe('John');
      expect(filtered[0].authors[0].surname).toBe('Doe');
    });

    it('should handle multiple filters', () => {
      const filtered = filterBooks(mockBooks, { status: 'reading', category: 'Fiction' });
      expect(filtered).toHaveLength(1);
    });

    it('should return empty array when no matches', () => {
      const filtered = filterBooks(mockBooks, { status: 'paused' });
      expect(filtered).toHaveLength(0);
    });
  });
});
