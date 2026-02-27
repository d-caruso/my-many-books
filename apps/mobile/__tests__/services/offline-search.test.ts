import { bookRepository } from '../../src/services/database/BookRepository';
import { databaseService } from '../../src/services/database/DatabaseService';
import { migrationSystem } from '../../src/services/database/migrations';
import { LocalBook } from '../../src/entities/LocalBook';
import type { Book } from '../../src/types';

describe('Offline Search, Filter, and Sort', () => {
  beforeAll(async () => {
    await databaseService.openDatabase();
    await migrationSystem.runMigrations();
  });

  afterAll(async () => {
    await databaseService.closeDatabase();
  });

  beforeEach(async () => {
    // Clear database before each test
    await databaseService.executeQuery('DELETE FROM books');

    // Populate test data with explicit timestamps to ensure proper ordering
    const now = Date.now();
    await bookRepository.create(new LocalBook({ title: 'The Great Gatsby', authors: 'F. Scott Fitzgerald', status: 'completed', rating: 5, updateDate: new Date(now - 3000).toISOString() } as Book));
    await bookRepository.create(new LocalBook({ title: 'To Kill a Mockingbird', authors: 'Harper Lee', status: 'reading', rating: 4, updateDate: new Date(now - 2000).toISOString() } as Book));
    await bookRepository.create(new LocalBook({ title: '1984', authors: 'George Orwell', status: 'want-to-read', rating: null, updateDate: new Date(now - 1000).toISOString() } as Book));
    await bookRepository.create(new LocalBook({ title: 'Pride and Prejudice', authors: 'Jane Austen', status: 'completed', rating: 5, updateDate: new Date(now).toISOString() } as Book));
  });

  describe('Offline Search', () => {
    it('should search by title', async () => {
      const results = await bookRepository.searchWithFilters({
        query: 'Great',
      });

      expect(results).toHaveLength(1);
      expect(results[0].entity.title).toBe('The Great Gatsby');
    });

    it('should search by author', async () => {
      const results = await bookRepository.searchWithFilters({
        query: 'Orwell',
      });

      expect(results).toHaveLength(1);
      expect(results[0].entity.title).toBe('1984');
    });

    it('should be case-insensitive', async () => {
      const results = await bookRepository.searchWithFilters({
        query: 'gatsby',
      });

      expect(results).toHaveLength(1);
      expect(results[0].entity.title).toBe('The Great Gatsby');
    });

    it('should search across multiple fields', async () => {
      const results = await bookRepository.searchWithFilters({
        query: 'kill',
      });

      expect(results).toHaveLength(1);
      expect(results[0].entity.title).toBe('To Kill a Mockingbird');
    });

    it('should return all books when no query provided', async () => {
      const results = await bookRepository.searchWithFilters({});

      expect(results).toHaveLength(4);
    });
  });

  describe('Offline Filters', () => {
    it('should filter by status', async () => {
      const results = await bookRepository.searchWithFilters({
        status: 'completed',
      });

      expect(results).toHaveLength(2);
      expect(results.every(book => book.entity.status === 'completed')).toBe(true);
    });

    it('should combine search and filter', async () => {
      const results = await bookRepository.searchWithFilters({
        query: 'Pride',
        status: 'completed',
      });

      expect(results).toHaveLength(1);
      expect(results[0].entity.title).toBe('Pride and Prejudice');
    });

    it('should return empty array for non-matching filter', async () => {
      const results = await bookRepository.searchWithFilters({
        status: 'paused',
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('Offline Sorting', () => {
    it('should sort by title ascending', async () => {
      const results = await bookRepository.searchWithFilters({
        sortBy: 'title',
        sortOrder: 'ASC',
      });

      expect(results).toHaveLength(4);
      expect(results[0].entity.title).toBe('1984');
      expect(results[1].entity.title).toBe('Pride and Prejudice');
      expect(results[2].entity.title).toBe('The Great Gatsby');
      expect(results[3].entity.title).toBe('To Kill a Mockingbird');
    });

    it('should sort by title descending', async () => {
      const results = await bookRepository.searchWithFilters({
        sortBy: 'title',
        sortOrder: 'DESC',
      });

      expect(results).toHaveLength(4);
      expect(results[0].entity.title).toBe('To Kill a Mockingbird');
      expect(results[3].entity.title).toBe('1984');
    });

    it('should sort by rating descending', async () => {
      const results = await bookRepository.searchWithFilters({
        sortBy: 'rating',
        sortOrder: 'DESC',
      });

      expect(results).toHaveLength(4);
      // Books with rating 5 should come first
      expect((results[0].entity as Record<string, unknown>).rating).toBe(5);
      expect((results[1].entity as Record<string, unknown>).rating).toBe(5);
    });

    it('should sort by update_date by default', async () => {
      const results = await bookRepository.searchWithFilters({});

      expect(results).toHaveLength(4);
      // Most recently updated should be first (Pride and Prejudice was added last)
      expect(results[0].entity.title).toBe('Pride and Prejudice');
    });
  });

  describe('Combined Search, Filter, and Sort', () => {
    it('should search, filter, and sort together', async () => {
      const results = await bookRepository.searchWithFilters({
        query: 'Pr',  // Matches "Pride and Prejudice"
        status: 'completed',
        sortBy: 'title',
        sortOrder: 'ASC',
      });

      expect(results).toHaveLength(1);
      expect(results[0].entity.title).toBe('Pride and Prejudice');
      expect(results[0].entity.status).toBe('completed');
    });

    it('should handle complex queries', async () => {
      // Search for completed books, sorted by rating
      const results = await bookRepository.searchWithFilters({
        status: 'completed',
        sortBy: 'rating',
        sortOrder: 'DESC',
      });

      expect(results).toHaveLength(2);
      expect(results.every(book => book.entity.status === 'completed')).toBe(true);
      expect(results.every(book => (book.entity as Record<string, unknown>).rating === 5)).toBe(true);
    });
  });
});
