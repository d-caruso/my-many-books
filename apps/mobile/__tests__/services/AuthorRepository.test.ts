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
      const author = await authorRepository.create({ name: 'J.K.', surname: 'Rowling' });

      expect(author).toBeDefined();
      expect(author.entity.id).toBeDefined();
      expect(author.entity.name).toBe('J.K.');
      expect(author.entity.surname).toBe('Rowling');
    });

    it('should return existing author if name and surname already exist', async () => {
      const author1 = await authorRepository.create({ name: 'J.K.', surname: 'Rowling' });
      const author2 = await authorRepository.create({ name: 'J.K.', surname: 'Rowling' });

      expect(author1.entity.id).toBe(author2.entity.id);
      expect(author1.entity.name).toBe(author2.entity.name);
      expect(author1.entity.surname).toBe(author2.entity.surname);

      // Verify only one author exists
      const all = await authorRepository.findAll();
      expect(all).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('should return all authors sorted by surname then name', async () => {
      await authorRepository.create({ name: 'Zach', surname: 'Author' });
      await authorRepository.create({ name: 'Alice', surname: 'Author' });
      await authorRepository.create({ name: 'Bob', surname: 'Brown' });

      const authors = await authorRepository.findAll();

      expect(authors).toHaveLength(3);
      expect(authors[0].entity.surname).toBe('Author');
      expect(authors[0].entity.name).toBe('Alice');
      expect(authors[1].entity.surname).toBe('Author');
      expect(authors[1].entity.name).toBe('Zach');
      expect(authors[2].entity.surname).toBe('Brown');
      expect(authors[2].entity.name).toBe('Bob');
    });
  });

  describe('findById', () => {
    it('should find author by ID', async () => {
      const created = await authorRepository.create({ name: 'Test', surname: 'Author' });

      const found = await authorRepository.findById(created.entity.id);

      expect(found).toBeDefined();
      expect(found?.entity.id).toBe(created.entity.id);
      expect(found?.entity.name).toBe('Test');
      expect(found?.entity.surname).toBe('Author');
    });

    it('should return null for non-existent ID', async () => {
      const found = await authorRepository.findById(99999);

      expect(found).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find author by name and surname', async () => {
      await authorRepository.create({ name: 'Stephen', surname: 'King' });

      const found = await authorRepository.findByName('Stephen', 'King');

      expect(found).toBeDefined();
      expect(found?.entity.name).toBe('Stephen');
      expect(found?.entity.surname).toBe('King');
    });

    it('should return null for non-existent name', async () => {
      const found = await authorRepository.findByName('Non-existent', 'Author');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update author fields', async () => {
      const author = await authorRepository.create({ name: 'Old', surname: 'Name' });

      const updated = await authorRepository.update(author.entity.id, {
        name: 'New',
        surname: 'Name',
        nationality: 'British',
      });

      expect(updated.entity.id).toBe(author.entity.id);
      expect(updated.entity.name).toBe('New');
      expect(updated.entity.surname).toBe('Name');
      expect(updated.entity.nationality).toBe('British');
    });
  });

  describe('delete', () => {
    it('should delete author', async () => {
      const author = await authorRepository.create({ name: 'Test', surname: 'Author' });

      await authorRepository.delete(author.entity.id);

      const found = await authorRepository.findById(author.entity.id);
      expect(found).toBeNull();
    });

    it('should cascade delete from book_authors junction table', async () => {
      const book = await bookRepository.create(
        new LocalBook({ title: 'Test Book', authors: [{ name: 'Test', surname: 'Author' }] } as Book)
      );
      const author = await authorRepository.findByName('Test', 'Author');

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
        new LocalBook({
          title: 'Test Book',
          authors: [
            { name: 'Author', surname: 'One' },
            { name: 'Author', surname: 'Three' },
          ],
        } as Book)
      );
      await authorRepository.create({ name: 'Author', surname: 'Two' }); // unlinked

      const authors = await authorRepository.findByBookId(String(book.entity.id));

      expect(authors).toHaveLength(2);
      expect(authors.some(a => a.entity.name === 'Author' && a.entity.surname === 'One')).toBe(true);
      expect(authors.some(a => a.entity.name === 'Author' && a.entity.surname === 'Three')).toBe(true);
      expect(authors.some(a => a.entity.name === 'Author' && a.entity.surname === 'Two')).toBe(false);
    });

    it('should return empty array for book with no authors', async () => {
      const book = await bookRepository.create(new LocalBook({ title: 'Test Book' } as Book));

      const authors = await authorRepository.findByBookId(String(book.entity.id));

      expect(authors).toHaveLength(0);
    });
  });

});
