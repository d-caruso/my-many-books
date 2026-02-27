import { categoryRepository } from '../../src/services/database/CategoryRepository';
import { bookRepository } from '../../src/services/database/BookRepository';
import { databaseService } from '../../src/services/database/DatabaseService';
import { migrationSystem } from '../../src/services/database/migrations';
import { LocalBook } from '../../src/entities/LocalBook';
import { SYNC_STATUS } from '../../src/types';
import type { Book } from '../../src/types';

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
      expect(category.entity.id).toBeDefined();
      expect(category.entity.name).toBe('Fiction');
      expect(category.entity.translationKey).toBeNull();
    });

    it('should create a category with translationKey', async () => {
      const category = await categoryRepository.create('Fiction', 'categories.fiction');

      expect(category.entity.translationKey).toBe('categories.fiction');
    });

    it('should return existing category if name already exists', async () => {
      const category1 = await categoryRepository.create('Fiction');
      const category2 = await categoryRepository.create('Fiction');

      expect(category1.entity.id).toBe(category2.entity.id);
      expect(category1.entity.name).toBe(category2.entity.name);

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
      expect(categories[0].entity.name).toBe('Fiction');
      expect(categories[1].entity.name).toBe('History');
      expect(categories[2].entity.name).toBe('Science');
    });
  });

  describe('findById', () => {
    it('should find category by ID', async () => {
      const created = await categoryRepository.create('Fiction');

      const found = await categoryRepository.findById(created.entity.id);

      expect(found).toBeDefined();
      expect(found?.entity.id).toBe(created.entity.id);
      expect(found?.entity.name).toBe('Fiction');
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
      expect(found?.entity.name).toBe('Non-Fiction');
    });

    it('should return null for non-existent name', async () => {
      const found = await categoryRepository.findByName('Non-existent Category');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update category name', async () => {
      const category = await categoryRepository.create('Old Name');

      const updated = await categoryRepository.update(category.entity.id, 'New Name');

      expect(updated.entity.id).toBe(category.entity.id);
      expect(updated.entity.name).toBe('New Name');
    });

    it('should update category translationKey when provided', async () => {
      const category = await categoryRepository.create('Fiction');

      const updated = await categoryRepository.update(
        category.entity.id,
        'Fiction',
        'categories.fiction'
      );

      expect(updated.entity.translationKey).toBe('categories.fiction');
    });
  });

  describe('delete', () => {
    it('should delete category', async () => {
      const category = await categoryRepository.create('Test Category');

      await categoryRepository.delete(category.entity.id);

      const found = await categoryRepository.findById(category.entity.id);
      expect(found).toBeNull();
    });

    it('should cascade delete from book_categories junction table', async () => {
      const book = await bookRepository.create(new LocalBook({ title: 'Test Book', categories: ['Test Category'] } as Book));
      const category = await categoryRepository.findByName('Test Category');

      // Verify junction entry exists
      let junctionEntry = await databaseService.getFirstAsync(
        'SELECT * FROM book_categories WHERE category_id = ?',
        [category!.entity.id]
      );
      expect(junctionEntry).toBeDefined();

      // Delete category
      await categoryRepository.delete(category!.entity.id);

      // Verify junction entry was deleted via CASCADE
      junctionEntry = await databaseService.getFirstAsync(
        'SELECT * FROM book_categories WHERE category_id = ?',
        [category!.entity.id]
      );
      expect(junctionEntry).toBeNull();
    });
  });

  describe('findByBookId', () => {
    it('should find categories for a book', async () => {
      const book = await bookRepository.create(
        new LocalBook({ title: 'Test Book', categories: ['Fiction', 'Adventure'] } as Book)
      );
      await categoryRepository.create('Romance'); // unlinked

      const categories = await categoryRepository.findByBookId(String(book.entity.id));

      expect(categories).toHaveLength(2);
      expect(categories.some(c => c.entity.name === 'Fiction')).toBe(true);
      expect(categories.some(c => c.entity.name === 'Adventure')).toBe(true);
      expect(categories.some(c => c.entity.name === 'Romance')).toBe(false);
    });

    it('should return empty array for book with no categories', async () => {
      const book = await bookRepository.create(new LocalBook({ title: 'Test Book' } as Book));

      const categories = await categoryRepository.findByBookId(String(book.entity.id));

      expect(categories).toHaveLength(0);
    });
  });

  describe('updateSyncFields', () => {
    it('should persist translationKey from sync', async () => {
      const category = await categoryRepository.create('Fantasy');

      await categoryRepository.updateSyncFields(category.entity.id, {
        translationKey: 'categories.fantasy',
        syncStatus: SYNC_STATUS.SYNCED,
      });

      const found = await categoryRepository.findById(category.entity.id);
      expect(found?.entity.translationKey).toBe('categories.fantasy');
    });
  });
});
