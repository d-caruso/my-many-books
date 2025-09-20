import { 
  formatDate, 
  getStatusLabel, 
  getStatusColor, 
  validateISBN, 
  truncateText,
  generateBookId,
  sanitizeSearchQuery,
  debounce,
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
      expect(sanitizeSearchQuery(null as any)).toBe('');
      expect(sanitizeSearchQuery(undefined as any)).toBe('');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce function calls', () => {
      let callCount = 0;
      const testFn = debounce(() => {
        callCount++;
      }, 50);

      // Call the function multiple times
      testFn();
      testFn();
      testFn();

      // Should not have been called yet
      expect(callCount).toBe(0);

      // Fast-forward time
      jest.advanceTimersByTime(50);

      // Should have been called once
      expect(callCount).toBe(1);
    });

    it('should reset debounce timer on new calls', () => {
      let callCount = 0;
      const testFn = debounce(() => {
        callCount++;
      }, 100);

      testFn();
      jest.advanceTimersByTime(50);
      
      // Call again before timer expires
      testFn();
      jest.advanceTimersByTime(50);
      
      // Should not have been called yet
      expect(callCount).toBe(0);
      
      // Advance the remaining time
      jest.advanceTimersByTime(50);
      
      // Now should be called
      expect(callCount).toBe(1);
    });
  });

  describe('groupBooksByStatus', () => {
    it('should group books by status', () => {
      const books: Book[] = [
        { id: 1, title: 'Book 1', status: 'reading', authors: [], categories: [], createdAt: '2023-01-01', updatedAt: '2023-01-01', isbnCode: '123' },
        { id: 2, title: 'Book 2', status: 'completed', authors: [], categories: [], createdAt: '2023-01-01', updatedAt: '2023-01-01', isbnCode: '456' },
        { id: 3, title: 'Book 3', status: 'reading', authors: [], categories: [], createdAt: '2023-01-01', updatedAt: '2023-01-01', isbnCode: '789' },
      ];

      const grouped = groupBooksByStatus(books);

      expect(grouped.reading).toHaveLength(2);
      expect(grouped.completed).toHaveLength(1);
      expect(grouped.reading[0].title).toBe('Book 1');
    });
  });

  describe('sortBooks', () => {
    const mockBooks: Book[] = [
      { id: 1, title: 'Zebra Book', authors: [{ id: 1, name: 'Author A', books: [] }], createdAt: '2023-01-01', status: 'reading', categories: [], updatedAt: '2023-01-01', isbnCode: '123' },
      { id: 2, title: 'Alpha Book', authors: [{ id: 2, name: 'Author Z', books: [] }], createdAt: '2023-01-02', status: 'completed', categories: [], updatedAt: '2023-01-02', isbnCode: '456' },
    ];

    it('should sort books by title', () => {
      const sorted = sortBooks(mockBooks, 'title');
      expect(sorted[0].title).toBe('Alpha Book');
      expect(sorted[1].title).toBe('Zebra Book');
    });

    it('should sort books by author', () => {
      const sorted = sortBooks(mockBooks, 'author');
      expect(sorted[0].authors[0].name).toBe('Author A');
      expect(sorted[1].authors[0].name).toBe('Author Z');
    });

    it('should sort books by date', () => {
      const sorted = sortBooks(mockBooks, 'date');
      expect(sorted[0].createdAt).toBe('2023-01-02');
      expect(sorted[1].createdAt).toBe('2023-01-01');
    });
  });

  describe('filterBooks', () => {
    const mockBooks: Book[] = [
      { 
        id: 1, 
        title: 'Book 1', 
        status: 'reading', 
        authors: [{ id: 1, name: 'John Doe', books: [] }], 
        categories: [{ id: 1, name: 'Fiction', books: [] }], 
        createdAt: '2023-01-01', 
        updatedAt: '2023-01-01', 
        isbnCode: '123' 
      },
      { 
        id: 2, 
        title: 'Book 2', 
        status: 'completed', 
        authors: [{ id: 2, name: 'Jane Smith', books: [] }], 
        categories: [{ id: 2, name: 'Non-Fiction', books: [] }], 
        createdAt: '2023-01-02', 
        updatedAt: '2023-01-02', 
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
      expect(filtered[0].authors[0].name).toBe('John Doe');
    });

    it('should handle multiple filters', () => {
      const filtered = filterBooks(mockBooks, { status: 'reading', category: 'Fiction' });
      expect(filtered).toHaveLength(1);
    });

    it('should return empty array when no matches', () => {
      const filtered = filterBooks(mockBooks, { status: 'want-to-read' });
      expect(filtered).toHaveLength(0);
    });
  });
});
