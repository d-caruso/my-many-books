import { bookRepository } from '../../src/services/database/BookRepository';
import { databaseService } from '../../src/services/database/DatabaseService';
import { migrationSystem } from '../../src/services/database/migrations';
import { LocalBook } from '../../src/entities/LocalBook';
import type { Book } from '../../src/types';
import {
  BOOK_STATUS,
  SEARCH_SORT_BY_FIELDS,
  SORT_DIRECTIONS,
} from '@my-many-books/shared-types';

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
    await databaseService.executeQuery('DELETE FROM book_authors');
    await databaseService.executeQuery('DELETE FROM authors');
    await databaseService.executeQuery('DELETE FROM books');

    // Populate test data with explicit timestamps to ensure proper ordering
    const now = Date.now();
    await bookRepository.create(
      new LocalBook({
        title: 'The Great Gatsby',
        authors: [{ id: 1, name: 'F. Scott', surname: 'Fitzgerald' }],
        status: BOOK_STATUS.FINISHED,
        rating: 5,
        creationDate: new Date(now - 4000).toISOString(),
        updateDate: new Date(now - 3000).toISOString(),
      } as unknown as Book)
    );
    await bookRepository.create(
      new LocalBook({
        title: 'To Kill a Mockingbird',
        authors: [{ id: 2, name: 'Harper', surname: 'Lee' }],
        status: BOOK_STATUS.READING,
        rating: 4,
        creationDate: new Date(now - 3000).toISOString(),
        updateDate: new Date(now - 2000).toISOString(),
      } as unknown as Book)
    );
    await bookRepository.create(
      new LocalBook({
        title: '1984',
        authors: [{ id: 3, name: 'George', surname: 'Orwell' }],
        status: BOOK_STATUS.READING,
        rating: null,
        creationDate: new Date(now - 2000).toISOString(),
        updateDate: new Date(now - 1000).toISOString(),
      } as unknown as Book)
    );
    await bookRepository.create(
      new LocalBook({
        title: 'Pride and Prejudice',
        authors: [{ id: 4, name: 'Jane', surname: 'Austen' }],
        status: BOOK_STATUS.FINISHED,
        rating: 5,
        creationDate: new Date(now - 1000).toISOString(),
        updateDate: new Date(now).toISOString(),
      } as unknown as Book)
    );
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
        status: BOOK_STATUS.FINISHED,
      });

      expect(results).toHaveLength(2);
      expect(results.every(book => book.entity.status === BOOK_STATUS.FINISHED)).toBe(true);
    });

    it('should combine search and filter', async () => {
      const results = await bookRepository.searchWithFilters({
        query: 'Pride',
        status: BOOK_STATUS.FINISHED,
      });

      expect(results).toHaveLength(1);
      expect(results[0].entity.title).toBe('Pride and Prejudice');
    });

    it('should return empty array for non-matching filter', async () => {
      const results = await bookRepository.searchWithFilters({
        status: BOOK_STATUS.PAUSED,
      });

      expect(results).toHaveLength(0);
    });
  });

  describe('Offline Sorting', () => {
    it('should sort by title ascending', async () => {
      const results = await bookRepository.searchWithFilters({
        sortBy: SEARCH_SORT_BY_FIELDS.TITLE,
        sortOrder: SORT_DIRECTIONS.ASC,
      });

      expect(results).toHaveLength(4);
      expect(results[0].entity.title).toBe('1984');
      expect(results[1].entity.title).toBe('Pride and Prejudice');
      expect(results[2].entity.title).toBe('The Great Gatsby');
      expect(results[3].entity.title).toBe('To Kill a Mockingbird');
    });

    it('should sort by title descending', async () => {
      const results = await bookRepository.searchWithFilters({
        sortBy: SEARCH_SORT_BY_FIELDS.TITLE,
        sortOrder: SORT_DIRECTIONS.DESC,
      });

      expect(results).toHaveLength(4);
      expect(results[0].entity.title).toBe('To Kill a Mockingbird');
      expect(results[3].entity.title).toBe('1984');
    });

    it('should sort by updateDate descending when explicitly requested', async () => {
      const results = await bookRepository.searchWithFilters({
        sortBy: SEARCH_SORT_BY_FIELDS.UPDATE_DATE,
        sortOrder: SORT_DIRECTIONS.DESC,
      });

      expect(results).toHaveLength(4);
      expect(results[0].entity.title).toBe('Pride and Prejudice');
      expect(results[1].entity.title).toBe('1984');
      expect(results[2].entity.title).toBe('To Kill a Mockingbird');
      expect(results[3].entity.title).toBe('The Great Gatsby');
    });

    it('should sort by updateDate ascending', async () => {
      const results = await bookRepository.searchWithFilters({
        sortBy: SEARCH_SORT_BY_FIELDS.UPDATE_DATE,
        sortOrder: SORT_DIRECTIONS.ASC,
      });

      expect(results).toHaveLength(4);
      expect(results[0].entity.title).toBe('The Great Gatsby');
      expect(results[3].entity.title).toBe('Pride and Prejudice');
    });

    it('should sort by title ascending by default', async () => {
      const results = await bookRepository.searchWithFilters({});

      expect(results).toHaveLength(4);
      expect(results[0].entity.title).toBe('1984');
      expect(results[1].entity.title).toBe('Pride and Prejudice');
      expect(results[2].entity.title).toBe('The Great Gatsby');
      expect(results[3].entity.title).toBe('To Kill a Mockingbird');
    });

    it('should sort by creationDate ascending', async () => {
      const results = await bookRepository.searchWithFilters({
        sortBy: SEARCH_SORT_BY_FIELDS.CREATION_DATE,
        sortOrder: SORT_DIRECTIONS.ASC,
      });

      expect(results).toHaveLength(4);
      expect(results[0].entity.title).toBe('The Great Gatsby');
      expect(results[3].entity.title).toBe('Pride and Prejudice');
    });

    it('should sort by creationDate descending', async () => {
      const results = await bookRepository.searchWithFilters({
        sortBy: SEARCH_SORT_BY_FIELDS.CREATION_DATE,
        sortOrder: SORT_DIRECTIONS.DESC,
      });

      expect(results).toHaveLength(4);
      expect(results[0].entity.title).toBe('Pride and Prejudice');
      expect(results[3].entity.title).toBe('The Great Gatsby');
    });

    it('should sort by status ascending', async () => {
      const results = await bookRepository.searchWithFilters({
        sortBy: SEARCH_SORT_BY_FIELDS.STATUS,
        sortOrder: SORT_DIRECTIONS.ASC,
      });

      expect(results).toHaveLength(4);
      expect(results[0].entity.title).toBe('Pride and Prejudice');
      expect(results[1].entity.title).toBe('The Great Gatsby');
    });

    it('should sort by status descending', async () => {
      const results = await bookRepository.searchWithFilters({
        sortBy: SEARCH_SORT_BY_FIELDS.STATUS,
        sortOrder: SORT_DIRECTIONS.DESC,
      });

      expect(results).toHaveLength(4);
      expect(results[0].entity.title).toBe('1984');
      expect(results[1].entity.title).toBe('To Kill a Mockingbird');
    });

    it('should sort by author using surname then name ascending', async () => {
      const results = await bookRepository.searchWithFilters({
        sortBy: SEARCH_SORT_BY_FIELDS.AUTHOR,
        sortOrder: SORT_DIRECTIONS.ASC,
      });

      expect(results).toHaveLength(4);
      expect(results[0].entity.title).toBe('Pride and Prejudice');
      expect(results[1].entity.title).toBe('The Great Gatsby');
      expect(results[2].entity.title).toBe('To Kill a Mockingbird');
      expect(results[3].entity.title).toBe('1984');
    });

    it('should sort by author using surname then name descending', async () => {
      const results = await bookRepository.searchWithFilters({
        sortBy: SEARCH_SORT_BY_FIELDS.AUTHOR,
        sortOrder: SORT_DIRECTIONS.DESC,
      });

      expect(results).toHaveLength(4);
      expect(results[0].entity.title).toBe('1984');
      expect(results[3].entity.title).toBe('Pride and Prejudice');
    });
  });

  describe('Combined Search, Filter, and Sort', () => {
    it('should search, filter, and sort together', async () => {
      const results = await bookRepository.searchWithFilters({
        query: 'Pr',  // Matches "Pride and Prejudice"
        status: BOOK_STATUS.FINISHED,
        sortBy: SEARCH_SORT_BY_FIELDS.TITLE,
        sortOrder: SORT_DIRECTIONS.ASC,
      });

      expect(results).toHaveLength(1);
      expect(results[0].entity.title).toBe('Pride and Prejudice');
      expect(results[0].entity.status).toBe(BOOK_STATUS.FINISHED);
    });

    it('should handle complex queries', async () => {
      // Search for completed books, sorted by rating
      const results = await bookRepository.searchWithFilters({
        status: BOOK_STATUS.FINISHED,
        sortBy: SEARCH_SORT_BY_FIELDS.UPDATE_DATE,
        sortOrder: SORT_DIRECTIONS.DESC,
      });

      expect(results).toHaveLength(2);
      expect(results.every(book => book.entity.status === BOOK_STATUS.FINISHED)).toBe(true);
      expect(results.every(book => (book.entity as Record<string, unknown>).rating === 5)).toBe(true);
    });
  });
});
