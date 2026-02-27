import { authorRepository } from '../../src/services/database/AuthorRepository';
import { bookRepository } from '../../src/services/database/BookRepository';
import { databaseService } from '../../src/services/database/DatabaseService';
import { migrationSystem } from '../../src/services/database/migrations';
import { LocalBook } from '../../src/entities/LocalBook';
import type { Book } from '../../src/types';

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
      expect(author.entity.id).toBeDefined();
      expect(author.entity.name).toBe('J.K. Rowling');
    });

    it('should return existing author if name already exists', async () => {
      const author1 = await authorRepository.create('J.K. Rowling');
      const author2 = await authorRepository.create('J.K. Rowling');

      expect(author1.entity.id).toBe(author2.entity.id);
      expect(author1.entity.name).toBe(author2.entity.name);

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
      expect(authors[0].entity.name).toBe('Alice Author');
      expect(authors[1].entity.name).toBe('Bob Author');
      expect(authors[2].entity.name).toBe('Zach Author');
    });
  });

  describe('findById', () => {
    it('should find author by ID', async () => {
      const created = await authorRepository.create('Test Author');

      const found = await authorRepository.findById(created.entity.id);

      expect(found).toBeDefined();
      expect(found?.entity.id).toBe(created.entity.id);
      expect(found?.entity.name).toBe('Test Author');
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
      expect(found?.entity.name).toBe('Stephen King');
    });

    it('should return null for non-existent name', async () => {
      const found = await authorRepository.findByName('Non-existent Author');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update author name', async () => {
      const author = await authorRepository.create('Old Name');

      const updated = await authorRepository.update(author.entity.id, 'New Name');

      expect(updated.entity.id).toBe(author.entity.id);
      expect(updated.entity.name).toBe('New Name');
    });
  });

  describe('delete', () => {
    it('should delete author', async () => {
      const author = await authorRepository.create('Test Author');

      await authorRepository.delete(author.entity.id);

      const found = await authorRepository.findById(author.entity.id);
      expect(found).toBeNull();
    });

    it('should cascade delete from book_authors junction table', async () => {
      const book = await bookRepository.create(new LocalBook({ title: 'Test Book', authors: [{ name: 'Test Author' }] } as Book));
      const author = await authorRepository.findByName('Test Author');

      // Verify junction entry exists
      let junctionEntry = await databaseService.getFirstAsync(
        'SELECT * FROM book_authors WHERE author_id = ?',
        [author!.entity.id]
      );
      expect(junctionEntry).toBeDefined();

      // Delete author
      await authorRepository.delete(author!.entity.id);

      // Verify junction entry was deleted via CASCADE
      junctionEntry = await databaseService.getFirstAsync(
        'SELECT * FROM book_authors WHERE author_id = ?',
        [author!.entity.id]
      );
      expect(junctionEntry).toBeNull();
    });
  });

  describe('findByBookId', () => {
    it('should find authors for a book', async () => {
      const book = await bookRepository.create(
        new LocalBook({ title: 'Test Book', authors: [{ name: 'Author 1' }, { name: 'Author 3' }] } as Book)
      );
      await authorRepository.create('Author 2'); // unlinked

      const authors = await authorRepository.findByBookId(String(book.entity.id));

      expect(authors).toHaveLength(2);
      expect(authors.some(a => a.entity.name === 'Author 1')).toBe(true);
      expect(authors.some(a => a.entity.name === 'Author 3')).toBe(true);
      expect(authors.some(a => a.entity.name === 'Author 2')).toBe(false);
    });

    it('should return empty array for book with no authors', async () => {
      const book = await bookRepository.create(new LocalBook({ title: 'Test Book' } as Book));

      const authors = await authorRepository.findByBookId(String(book.entity.id));

      expect(authors).toHaveLength(0);
    });
  });

});
