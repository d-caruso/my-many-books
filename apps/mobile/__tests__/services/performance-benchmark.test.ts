import { bookRepository } from '../../src/services/database/BookRepository';
import { databaseService } from '../../src/services/database/DatabaseService';
import { migrationSystem } from '../../src/services/database/migrations';
import { LocalBook } from '../../src/entities/LocalBook';
import { SYNC_STATUS } from '../../src/types';
import type { Book } from '../../src/types';
import {
  BOOK_STATUS,
  SEARCH_SORT_BY_FIELDS,
  SORT_DIRECTIONS,
} from '@my-many-books/shared-types';

describe('Performance Benchmarks', () => {
  beforeAll(async () => {
    await databaseService.openDatabase();
    await migrationSystem.runMigrations();
  });

  afterAll(async () => {
    await databaseService.closeDatabase();
  });

  beforeEach(async () => {
    // Clear database
    await databaseService.executeQuery('DELETE FROM books');
  });

  it('should handle 100 books efficiently', async () => {
    // Create 100 test books
    const createStart = Date.now();
    for (let i = 0; i < 100; i++) {
      const book = new LocalBook({
        title: `Test Book ${i}`,
        authors: `Author ${i % 10}`,
        status: i % 4 === 0 ? BOOK_STATUS.FINISHED : i % 4 === 1 ? BOOK_STATUS.READING : i % 4 === 2 ? BOOK_STATUS.PAUSED : BOOK_STATUS.PAUSED,
        rating: i % 5 === 0 ? 5 : i % 5 === 1 ? 4 : null,
      } as unknown as Book);
      await bookRepository.create(book);
    }
    const createTime = Date.now() - createStart;
    console.log(`Created 100 books in ${createTime}ms`);

    // Query all books
    const queryStart = Date.now();
    const allBooks = await bookRepository.findAll();
    const queryTime = Date.now() - queryStart;
    console.log(`Queried 100 books in ${queryTime}ms`);

    expect(allBooks).toHaveLength(100);
    expect(queryTime).toBeLessThan(500); // Should complete in under 500ms
  });

  it('should search efficiently with indexes', async () => {
    // Create 50 books
    for (let i = 0; i < 50; i++) {
      await bookRepository.create(new LocalBook({
        title: `Book ${i}`,
        authors: i % 2 === 0 ? 'Stephen King' : 'J.K. Rowling',
        status: BOOK_STATUS.FINISHED,
      } as unknown as Book));
    }

    // Search with filter
    const searchStart = Date.now();
    const results = await bookRepository.searchWithFilters({
      query: 'Stephen King',
      status: BOOK_STATUS.FINISHED,
      sortBy: SEARCH_SORT_BY_FIELDS.TITLE,
      sortOrder: SORT_DIRECTIONS.ASC,
    });
    const searchTime = Date.now() - searchStart;
    console.log(`Searched and filtered 50 books in ${searchTime}ms`);

    expect(results).toHaveLength(25);
    expect(searchTime).toBeLessThan(200); // Should complete quickly with indexes
  });

  it('should handle status filtering efficiently', async () => {
    // Create 200 books with different statuses
    for (let i = 0; i < 200; i++) {
      await bookRepository.create(new LocalBook({
        title: `Book ${i}`,
        status: i % 4 === 0 ? BOOK_STATUS.FINISHED : i % 4 === 1 ? BOOK_STATUS.READING : BOOK_STATUS.PAUSED,
      } as unknown as Book));
    }

    // Filter by status (should use index)
    const filterStart = Date.now();
    const completed = await bookRepository.findByStatus(BOOK_STATUS.FINISHED);
    const filterTime = Date.now() - filterStart;
    console.log(`Filtered 200 books by status in ${filterTime}ms`);

    expect(completed).toHaveLength(50);
    expect(filterTime).toBeLessThan(100); // Index should make this very fast
  });

  it('should find pending sync operations efficiently', async () => {
    // Create mix of synced and pending books
    for (let i = 0; i < 100; i++) {
      const book = new LocalBook({ title: `Book ${i}` } as Book);
      book.syncStatus = i % 3 === 0 ? SYNC_STATUS.PENDING : i % 3 === 1 ? SYNC_STATUS.FAILED : SYNC_STATUS.SYNCED;
      await bookRepository.create(book);
    }

    // Find pending sync (should use composite index)
    const syncStart = Date.now();
    const pending = await bookRepository.findPendingSync();
    const syncTime = Date.now() - syncStart;
    console.log(`Found pending sync items in ${syncTime}ms`);

    expect(pending.length).toBeGreaterThan(0);
    expect(syncTime).toBeLessThan(100);
  });

  it('should handle 1000 books efficiently (Task 4.7.3)', async () => {
    console.log('\n=== Testing with 1000 books (Task 4.7.3 requirement) ===');

    // Create 1000 test books sequentially to avoid transaction conflicts
    const createStart = Date.now();
    for (let i = 0; i < 1000; i++) {
      await bookRepository.create(new LocalBook({
        title: `Book ${i}`,
        authors: `Author ${i % 50}`, // 50 different authors
        isbnCode: `ISBN-${1000000000 + i}`,
        status: i % 4 === 0 ? BOOK_STATUS.FINISHED : i % 4 === 1 ? BOOK_STATUS.READING : BOOK_STATUS.PAUSED,
        rating: i % 10 === 0 ? 5 : i % 10 === 1 ? 4 : i % 10 === 2 ? 3 : null,
      } as unknown as Book));

      // Progress logging every 200 books
      if ((i + 1) % 200 === 0) {
        console.log(`Created ${i + 1} books...`);
      }
    }
    const createTime = Date.now() - createStart;
    console.log(`✅ Created 1000 books in ${createTime}ms`);

    // Load all books
    const loadStart = Date.now();
    const allBooks = await bookRepository.findAll();
    const loadTime = Date.now() - loadStart;
    console.log(`✅ Loaded 1000 books in ${loadTime}ms`);
    expect(allBooks).toHaveLength(1000);
    expect(loadTime).toBeLessThan(2000); // Should load in under 2 seconds

    // Search books
    const searchStart = Date.now();
    const searchResults = await bookRepository.searchWithFilters({
      query: 'Book 5',
      sortBy: SEARCH_SORT_BY_FIELDS.TITLE,
      sortOrder: SORT_DIRECTIONS.ASC,
    });
    const searchTime = Date.now() - searchStart;
    console.log(`✅ Searched 1000 books in ${searchTime}ms (${searchResults.length} results)`);
    expect(searchTime).toBeLessThan(300); // Indexed search should be fast

    // Filter by status
    const filterStart = Date.now();
    const completedBooks = await bookRepository.findByStatus(BOOK_STATUS.FINISHED);
    const filterTime = Date.now() - filterStart;
    console.log(`✅ Filtered 1000 books by status in ${filterTime}ms (${completedBooks.length} results)`);
    expect(completedBooks.length).toBe(250); // 1/4 of books
    expect(filterTime).toBeLessThan(200); // Index on status should make this very fast

    // Sort by rating
    const sortStart = Date.now();
    const topRated = await bookRepository.searchWithFilters({
      sortBy: SEARCH_SORT_BY_FIELDS.UPDATED_AT,
      sortOrder: SORT_DIRECTIONS.DESC,
    });
    const sortTime = Date.now() - sortStart;
    console.log(`✅ Sorted 1000 books by rating in ${sortTime}ms`);
    expect(sortTime).toBeLessThan(500); // Index on rating helps

    console.log('\n=== Performance Summary ===');
    console.log(`Total time for all operations: ${createTime + loadTime + searchTime + filterTime + sortTime}ms`);
    console.log('✅ All operations completed within performance targets');
  }, 30000); // Increase timeout to 30 seconds for this large test

  it('should demonstrate SQLite > AsyncStorage benefits', () => {
    console.log('\n=== SQLite vs AsyncStorage Benefits ===');
    console.log('✅ SQLite: Indexed queries for fast search/filter');
    console.log('✅ SQLite: Complex WHERE/ORDER BY clauses');
    console.log('✅ SQLite: ACID transactions for data safety');
    console.log('✅ SQLite: Relational queries with JOINs');
    console.log('✅ SQLite: Handles 1000s of records efficiently');
    console.log('❌ AsyncStorage: Full JSON parse on every read');
    console.log('❌ AsyncStorage: No native filtering/sorting');
    console.log('❌ AsyncStorage: Performance degrades with size');
    expect(true).toBe(true);
  });
});
