import { categoryRepository } from '../../src/services/database/CategoryRepository';
import { bookRepository } from '../../src/services/database/BookRepository';
import { databaseService } from '../../src/services/database/DatabaseService';
import { migrationSystem } from '../../src/services/database/migrations';

describe('CategoryRepository', () => {
  beforeAll(async () => {
    await databaseService.openDatabase();
    await migrationSystem.runMigrations();
  });

  afterAll(async () => {
    await databaseService.closeDatabase();
  });

  beforeEach(async () => {
    // Clear tables before each test
    await databaseService.executeQuery('DELETE FROM book_categories');
    await databaseService.executeQuery('DELETE FROM categories');
    await databaseService.executeQuery('DELETE FROM books');
  });

  describe('create', () => {
    it('should create a new category', async () => {
      const category = await categoryRepository.create('Fiction');

      expect(category).toBeDefined();
      expect(category.id).toBeDefined();
      expect(category.name).toBe('Fiction');
    });

    it('should return existing category if name already exists', async () => {
      const category1 = await categoryRepository.create('Fiction');
      const category2 = await categoryRepository.create('Fiction');

      expect(category1.id).toBe(category2.id);
      expect(category1.name).toBe(category2.name);

      // Verify only one category exists
      const all = await categoryRepository.findAll();
      expect(all).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('should return all categories sorted by name', async () => {
      await categoryRepository.create('Science');
      await categoryRepository.create('Fiction');
      await categoryRepository.create('History');

      const categories = await categoryRepository.findAll();

      expect(categories).toHaveLength(3);
      expect(categories[0].name).toBe('Fiction');
      expect(categories[1].name).toBe('History');
      expect(categories[2].name).toBe('Science');
    });
  });

  describe('findById', () => {
    it('should find category by ID', async () => {
      const created = await categoryRepository.create('Fiction');

      const found = await categoryRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Fiction');
    });

    it('should return null for non-existent ID', async () => {
      const found = await categoryRepository.findById(99999);

      expect(found).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find category by name', async () => {
      await categoryRepository.create('Non-Fiction');

      const found = await categoryRepository.findByName('Non-Fiction');

      expect(found).toBeDefined();
      expect(found?.name).toBe('Non-Fiction');
    });

    it('should return null for non-existent name', async () => {
      const found = await categoryRepository.findByName('Non-existent Category');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update category name', async () => {
      const category = await categoryRepository.create('Old Name');

      const updated = await categoryRepository.update(category.id, 'New Name');

      expect(updated.id).toBe(category.id);
      expect(updated.name).toBe('New Name');
    });
  });

  describe('delete', () => {
    it('should delete category', async () => {
      const category = await categoryRepository.create('Test Category');

      await categoryRepository.delete(category.id);

      const found = await categoryRepository.findById(category.id);
      expect(found).toBeNull();
    });

    it('should cascade delete from book_categories junction table', async () => {
      const category = await categoryRepository.create('Test Category');
      const book = await bookRepository.create({ title: 'Test Book' });
      await categoryRepository.addToBook(category.id, book.id);

      // Verify junction entry exists
      let junctionEntry = await databaseService.getFirstAsync(
        'SELECT * FROM book_categories WHERE category_id = ?',
        [category.id]
      );
      expect(junctionEntry).toBeDefined();

      // Delete category
      await categoryRepository.delete(category.id);

      // Verify junction entry was deleted via CASCADE
      junctionEntry = await databaseService.getFirstAsync(
        'SELECT * FROM book_categories WHERE category_id = ?',
        [category.id]
      );
      expect(junctionEntry).toBeNull();
    });
  });

  describe('findByBookId', () => {
    it('should find categories for a book', async () => {
      const category1 = await categoryRepository.create('Fiction');
      const category2 = await categoryRepository.create('Adventure');
      const category3 = await categoryRepository.create('Romance');
      const book = await bookRepository.create({ title: 'Test Book' });

      await categoryRepository.addToBook(category1.id, book.id);
      await categoryRepository.addToBook(category2.id, book.id);

      const categories = await categoryRepository.findByBookId(book.id);

      expect(categories).toHaveLength(2);
      expect(categories.some(c => c.id === category1.id)).toBe(true);
      expect(categories.some(c => c.id === category2.id)).toBe(true);
      expect(categories.some(c => c.id === category3.id)).toBe(false);
    });

    it('should return empty array for book with no categories', async () => {
      const book = await bookRepository.create({ title: 'Test Book' });

      const categories = await categoryRepository.findByBookId(book.id);

      expect(categories).toHaveLength(0);
    });
  });

  describe('addToBook', () => {
    it('should add category to book', async () => {
      const category = await categoryRepository.create('Fiction');
      const book = await bookRepository.create({ title: 'Test Book' });

      await categoryRepository.addToBook(category.id, book.id);

      const categories = await categoryRepository.findByBookId(book.id);
      expect(categories).toHaveLength(1);
      expect(categories[0].id).toBe(category.id);
    });

    it('should ignore duplicate entries (INSERT OR IGNORE)', async () => {
      const category = await categoryRepository.create('Fiction');
      const book = await bookRepository.create({ title: 'Test Book' });

      await categoryRepository.addToBook(category.id, book.id);
      await categoryRepository.addToBook(category.id, book.id); // Duplicate

      const categories = await categoryRepository.findByBookId(book.id);
      expect(categories).toHaveLength(1); // Should still be 1, not 2
    });
  });

  describe('removeFromBook', () => {
    it('should remove category from book', async () => {
      const category = await categoryRepository.create('Fiction');
      const book = await bookRepository.create({ title: 'Test Book' });
      await categoryRepository.addToBook(category.id, book.id);

      await categoryRepository.removeFromBook(category.id, book.id);

      const categories = await categoryRepository.findByBookId(book.id);
      expect(categories).toHaveLength(0);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await categoryRepository.create('Science Fiction');
      await categoryRepository.create('Science');
      await categoryRepository.create('Romance');
    });

    it('should search by partial name', async () => {
      const results = await categoryRepository.search('Science');

      expect(results).toHaveLength(2);
      expect(results.some(c => c.name === 'Science Fiction')).toBe(true);
      expect(results.some(c => c.name === 'Science')).toBe(true);
    });

    it('should be case-insensitive', async () => {
      const results = await categoryRepository.search('romance');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Romance');
    });

    it('should return empty array for no matches', async () => {
      const results = await categoryRepository.search('Non-existent');

      expect(results).toHaveLength(0);
    });
  });
});
