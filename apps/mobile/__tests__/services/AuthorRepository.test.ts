import { authorRepository } from '../../src/services/database/AuthorRepository';
import { bookRepository } from '../../src/services/database/BookRepository';
import { databaseService } from '../../src/services/database/DatabaseService';
import { migrationSystem } from '../../src/services/database/migrations';

describe('AuthorRepository', () => {
  beforeAll(async () => {
    await databaseService.openDatabase();
    await migrationSystem.runMigrations();
  });

  afterAll(async () => {
    await databaseService.closeDatabase();
  });

  beforeEach(async () => {
    // Clear tables before each test
    await databaseService.executeQuery('DELETE FROM book_authors');
    await databaseService.executeQuery('DELETE FROM authors');
    await databaseService.executeQuery('DELETE FROM books');
  });

  describe('create', () => {
    it('should create a new author', async () => {
      const author = await authorRepository.create('J.K. Rowling');

      expect(author).toBeDefined();
      expect(author.id).toBeDefined();
      expect(author.name).toBe('J.K. Rowling');
    });

    it('should return existing author if name already exists', async () => {
      const author1 = await authorRepository.create('J.K. Rowling');
      const author2 = await authorRepository.create('J.K. Rowling');

      expect(author1.id).toBe(author2.id);
      expect(author1.name).toBe(author2.name);

      // Verify only one author exists
      const all = await authorRepository.findAll();
      expect(all).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('should return all authors sorted by name', async () => {
      await authorRepository.create('Zach Author');
      await authorRepository.create('Alice Author');
      await authorRepository.create('Bob Author');

      const authors = await authorRepository.findAll();

      expect(authors).toHaveLength(3);
      expect(authors[0].name).toBe('Alice Author');
      expect(authors[1].name).toBe('Bob Author');
      expect(authors[2].name).toBe('Zach Author');
    });
  });

  describe('findById', () => {
    it('should find author by ID', async () => {
      const created = await authorRepository.create('Test Author');

      const found = await authorRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Test Author');
    });

    it('should return null for non-existent ID', async () => {
      const found = await authorRepository.findById(99999);

      expect(found).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find author by name', async () => {
      await authorRepository.create('Stephen King');

      const found = await authorRepository.findByName('Stephen King');

      expect(found).toBeDefined();
      expect(found?.name).toBe('Stephen King');
    });

    it('should return null for non-existent name', async () => {
      const found = await authorRepository.findByName('Non-existent Author');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update author name', async () => {
      const author = await authorRepository.create('Old Name');

      const updated = await authorRepository.update(author.id, 'New Name');

      expect(updated.id).toBe(author.id);
      expect(updated.name).toBe('New Name');
    });
  });

  describe('delete', () => {
    it('should delete author', async () => {
      const author = await authorRepository.create('Test Author');

      await authorRepository.delete(author.id);

      const found = await authorRepository.findById(author.id);
      expect(found).toBeNull();
    });

    it('should cascade delete from book_authors junction table', async () => {
      const author = await authorRepository.create('Test Author');
      const book = await bookRepository.create({ title: 'Test Book' });
      await authorRepository.addToBook(author.id, book.id);

      // Verify junction entry exists
      let junctionEntry = await databaseService.getFirstAsync(
        'SELECT * FROM book_authors WHERE author_id = ?',
        [author.id]
      );
      expect(junctionEntry).toBeDefined();

      // Delete author
      await authorRepository.delete(author.id);

      // Verify junction entry was deleted via CASCADE
      junctionEntry = await databaseService.getFirstAsync(
        'SELECT * FROM book_authors WHERE author_id = ?',
        [author.id]
      );
      expect(junctionEntry).toBeNull();
    });
  });

  describe('findByBookId', () => {
    it('should find authors for a book', async () => {
      const author1 = await authorRepository.create('Author 1');
      const author2 = await authorRepository.create('Author 2');
      const author3 = await authorRepository.create('Author 3');
      const book = await bookRepository.create({ title: 'Test Book' });

      await authorRepository.addToBook(author1.id, book.id);
      await authorRepository.addToBook(author3.id, book.id);

      const authors = await authorRepository.findByBookId(book.id);

      expect(authors).toHaveLength(2);
      expect(authors.some(a => a.id === author1.id)).toBe(true);
      expect(authors.some(a => a.id === author3.id)).toBe(true);
      expect(authors.some(a => a.id === author2.id)).toBe(false);
    });

    it('should return empty array for book with no authors', async () => {
      const book = await bookRepository.create({ title: 'Test Book' });

      const authors = await authorRepository.findByBookId(book.id);

      expect(authors).toHaveLength(0);
    });
  });

  describe('addToBook', () => {
    it('should add author to book', async () => {
      const author = await authorRepository.create('Test Author');
      const book = await bookRepository.create({ title: 'Test Book' });

      await authorRepository.addToBook(author.id, book.id);

      const authors = await authorRepository.findByBookId(book.id);
      expect(authors).toHaveLength(1);
      expect(authors[0].id).toBe(author.id);
    });

    it('should ignore duplicate entries (INSERT OR IGNORE)', async () => {
      const author = await authorRepository.create('Test Author');
      const book = await bookRepository.create({ title: 'Test Book' });

      await authorRepository.addToBook(author.id, book.id);
      await authorRepository.addToBook(author.id, book.id); // Duplicate

      const authors = await authorRepository.findByBookId(book.id);
      expect(authors).toHaveLength(1); // Should still be 1, not 2
    });
  });

  describe('removeFromBook', () => {
    it('should remove author from book', async () => {
      const author = await authorRepository.create('Test Author');
      const book = await bookRepository.create({ title: 'Test Book' });
      await authorRepository.addToBook(author.id, book.id);

      await authorRepository.removeFromBook(author.id, book.id);

      const authors = await authorRepository.findByBookId(book.id);
      expect(authors).toHaveLength(0);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await authorRepository.create('Stephen King');
      await authorRepository.create('Stephen Hawking');
      await authorRepository.create('J.K. Rowling');
    });

    it('should search by partial name', async () => {
      const results = await authorRepository.search('Stephen');

      expect(results).toHaveLength(2);
      expect(results.some(a => a.name === 'Stephen King')).toBe(true);
      expect(results.some(a => a.name === 'Stephen Hawking')).toBe(true);
    });

    it('should be case-insensitive', async () => {
      const results = await authorRepository.search('rowling');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('J.K. Rowling');
    });

    it('should return empty array for no matches', async () => {
      const results = await authorRepository.search('Non-existent');

      expect(results).toHaveLength(0);
    });
  });
});
