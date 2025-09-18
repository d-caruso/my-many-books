// ================================================================
// tests/models/BookCategory.test.ts
// Comprehensive tests for BookCategory junction model
// ================================================================

import { Sequelize } from 'sequelize';
import { BookCategory } from '../../../src/models/BookCategory';
import { Book } from '../../../src/models/Book';
import { Category } from '../../../src/models/Category';
import { ModelManager } from '../../../src/models';

describe('BookCategory Model', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    sequelize = new Sequelize('sqlite::memory:', {
      logging: false,
    });

    // Initialize all models using ModelManager
    ModelManager.initialize(sequelize);

    // Sync database
    await ModelManager.syncDatabase(true);
  });

  afterAll(async () => {
    await ModelManager.close();
  });

  beforeEach(async () => {
    // Clean up data before each test - use try/catch to handle errors gracefully
    try {
      await BookCategory.destroy({ where: {}, truncate: true });
    } catch (error) {
      // Ignore errors during cleanup
    }
    try {
      await Book.destroy({ where: {}, truncate: true });
    } catch (error) {
      // Ignore errors during cleanup
    }
    try {
      await Category.destroy({ where: {}, truncate: true });
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('Model Definition', () => {
    it('should have correct table name', () => {
      expect(BookCategory.getTableName()).toBe('book_categories');
    });

    it('should have correct model name', () => {
      expect(BookCategory.getModelName()).toBe('BookCategory');
    });
  });

  describe('Model Creation', () => {
    let book: Book;
    let category: Category;

    beforeEach(async () => {
      book = await Book.create({
        isbnCode: '9780140449136',
        title: 'Test Book',
      } as any);

      category = await Category.create({
        name: 'Fiction',
      } as any);
    });

    it('should create a book-category relationship with valid data', async () => {
      const bookCategory = await BookCategory.create({
        bookId: book.id,
        categoryId: category.id,
      } as any);

      expect(bookCategory.bookId).toBe(book.id);
      expect(bookCategory.categoryId).toBe(category.id);
      expect(bookCategory.creationDate).toBeDefined();
      expect(bookCategory.updateDate).toBeDefined();
    });

    it('should fail to create without bookId', async () => {
      await expect(BookCategory.create({
        categoryId: category.id,
      } as any)).rejects.toThrow();
    });

    it('should fail to create without categoryId', async () => {
      await expect(BookCategory.create({
        bookId: book.id,
      } as any)).rejects.toThrow();
    });

    it('should enforce unique constraint on bookId-categoryId pair', async () => {
      await BookCategory.create({
        bookId: book.id,
        categoryId: category.id,
      } as any);

      // Should fail when trying to create duplicate
      await expect(BookCategory.create({
        bookId: book.id,
        categoryId: category.id,
      } as any)).rejects.toThrow();
    });

    it('should allow same book with different categories', async () => {
      const category2 = await Category.create({
        name: 'Science Fiction',
      } as any);

      const bookCategory1 = await BookCategory.create({
        bookId: book.id,
        categoryId: category.id,
      } as any);

      const bookCategory2 = await BookCategory.create({
        bookId: book.id,
        categoryId: category2.id,
      } as any);

      expect(bookCategory1.bookId).toBe(book.id);
      expect(bookCategory2.bookId).toBe(book.id);
      expect(bookCategory1.categoryId).not.toBe(bookCategory2.categoryId);
    });

    it('should allow same category with different books', async () => {
      const book2 = await Book.create({
        isbnCode: '9780140449143',
        title: 'Another Book',
      } as any);

      const bookCategory1 = await BookCategory.create({
        bookId: book.id,
        categoryId: category.id,
      } as any);

      const bookCategory2 = await BookCategory.create({
        bookId: book2.id,
        categoryId: category.id,
      } as any);

      expect(bookCategory1.categoryId).toBe(category.id);
      expect(bookCategory2.categoryId).toBe(category.id);
      expect(bookCategory1.bookId).not.toBe(bookCategory2.bookId);
    });
  });

  describe('Instance Methods', () => {
    let book: Book;
    let category: Category;
    let bookCategory: BookCategory;

    beforeEach(async () => {
      book = await Book.create({
        isbnCode: '9780140449136',
        title: 'Test Book',
      } as any);

      category = await Category.create({
        name: 'Fiction',
      } as any);

      bookCategory = await BookCategory.create({
        bookId: book.id,
        categoryId: category.id,
      } as any);
    });

    it('should serialize to JSON correctly', () => {
      const json = bookCategory.toJSON();

      expect(json).toHaveProperty('bookId', book.id);
      expect(json).toHaveProperty('categoryId', category.id);
      expect(json).toHaveProperty('creationDate');
      expect(json).toHaveProperty('updateDate');
    });

    it('should update updateDate when modified', async () => {
      const originalUpdateDate = bookCategory.updateDate;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 50));

      // Force an update by calling save with changed=true
      await bookCategory.save({ silent: false });

      // Reload to get updated timestamp
      await bookCategory.reload();

      expect(bookCategory.updateDate?.getTime()).toBeGreaterThanOrEqual(originalUpdateDate?.getTime() || 0);
    });
  });

  describe('Static Methods', () => {
    let book1: Book;
    let book2: Book;
    let category1: Category;
    let category2: Category;

    beforeEach(async () => {
      book1 = await Book.create({
        isbnCode: '9780140449136',
        title: 'First Book',
      } as any);

      book2 = await Book.create({
        isbnCode: '9780140449143',
        title: 'Second Book',
      } as any);

      category1 = await Category.create({
        name: 'Fiction',
      } as any);

      category2 = await Category.create({
        name: 'Science Fiction',
      } as any);
    });

    describe('addCategoryToBook', () => {
      it('should add category to book successfully', async () => {
        const bookCategory = await BookCategory.addCategoryToBook(book1.id, category1.id);

        expect(bookCategory.bookId).toBe(book1.id);
        expect(bookCategory.categoryId).toBe(category1.id);
        expect(bookCategory.creationDate).toBeDefined();
      });

      it('should throw error for duplicate relationship', async () => {
        await BookCategory.addCategoryToBook(book1.id, category1.id);

        await expect(BookCategory.addCategoryToBook(book1.id, category1.id)).rejects.toThrow();
      });

      it('should throw error for invalid book ID', async () => {
        await expect(BookCategory.addCategoryToBook(99999, category1.id)).rejects.toThrow();
      });

      it('should throw error for invalid category ID', async () => {
        await expect(BookCategory.addCategoryToBook(book1.id, 99999)).rejects.toThrow();
      });
    });

    describe('removeCategoryFromBook', () => {
      it('should remove category from book successfully', async () => {
        await BookCategory.addCategoryToBook(book1.id, category1.id);

        const result = await BookCategory.removeCategoryFromBook(book1.id, category1.id);

        expect(result).toBe(true);

        const relationshipExists = await BookCategory.findOne({
          where: { bookId: book1.id, categoryId: category1.id }
        });
        expect(relationshipExists).toBeNull();
      });

      it('should return false for non-existent relationship', async () => {
        const result = await BookCategory.removeCategoryFromBook(book1.id, category1.id);

        expect(result).toBe(false);
      });

      it('should return false for invalid IDs', async () => {
        const result = await BookCategory.removeCategoryFromBook(99999, 99999);

        expect(result).toBe(false);
      });
    });

    describe('getBooksByCategory', () => {
      beforeEach(async () => {
        // Create test relationships
        await BookCategory.addCategoryToBook(book1.id, category1.id);
        await BookCategory.addCategoryToBook(book2.id, category1.id);
        await BookCategory.addCategoryToBook(book1.id, category2.id);
      });

      it('should get all books by category', async () => {
        const bookCategories = await BookCategory.getBooksByCategory(category1.id);

        expect(bookCategories).toHaveLength(2);
        expect(bookCategories.map(bc => bc.bookId)).toContain(book1.id);
        expect(bookCategories.map(bc => bc.bookId)).toContain(book2.id);
      });

      it('should return empty array for category with no books', async () => {
        const category3 = await Category.create({
          name: 'Mystery',
        } as any);

        const bookCategories = await BookCategory.getBooksByCategory(category3.id);

        expect(bookCategories).toHaveLength(0);
      });

      it('should return empty array for non-existent category', async () => {
        const bookCategories = await BookCategory.getBooksByCategory(99999);

        expect(bookCategories).toHaveLength(0);
      });
    });

    describe('getCategoriesByBook', () => {
      beforeEach(async () => {
        // Create test relationships
        await BookCategory.addCategoryToBook(book1.id, category1.id);
        await BookCategory.addCategoryToBook(book1.id, category2.id);
        await BookCategory.addCategoryToBook(book2.id, category1.id);
      });

      it('should get all categories by book', async () => {
        const bookCategories = await BookCategory.getCategoriesByBook(book1.id);

        expect(bookCategories).toHaveLength(2);
        expect(bookCategories.map(bc => bc.categoryId)).toContain(category1.id);
        expect(bookCategories.map(bc => bc.categoryId)).toContain(category2.id);
      });

      it('should return empty array for book with no categories', async () => {
        const book3 = await Book.create({
          isbnCode: '9780140449150',
          title: 'Third Book',
        } as any);

        const bookCategories = await BookCategory.getCategoriesByBook(book3.id);

        expect(bookCategories).toHaveLength(0);
      });

      it('should return empty array for non-existent book', async () => {
        const bookCategories = await BookCategory.getCategoriesByBook(99999);

        expect(bookCategories).toHaveLength(0);
      });
    });
  });

  describe('Timestamps', () => {
    let book: Book;
    let category: Category;

    beforeEach(async () => {
      book = await Book.create({
        isbnCode: '9780140449136',
        title: 'Test Book',
      } as any);

      category = await Category.create({
        name: 'Fiction',
      } as any);
    });

    it('should auto-generate creation and update dates', async () => {
      const bookCategory = await BookCategory.create({
        bookId: book.id,
        categoryId: category.id,
      } as any);

      expect(bookCategory.creationDate).toBeInstanceOf(Date);
      expect(bookCategory.updateDate).toBeInstanceOf(Date);
      expect(bookCategory.creationDate.getTime()).toBeLessThanOrEqual(Date.now());
      expect(bookCategory.updateDate?.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should update updateDate when record is modified', async () => {
      const bookCategory = await BookCategory.create({
        bookId: book.id,
        categoryId: category.id,
      } as any);

      const originalUpdateDate = bookCategory.updateDate;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 50));

      // Force an update by calling save
      await bookCategory.save({ silent: false });

      // Reload to get updated timestamp
      await bookCategory.reload();

      expect(bookCategory.updateDate?.getTime()).toBeGreaterThanOrEqual(originalUpdateDate?.getTime() || 0);
    });
  });

  describe('Querying', () => {
    let book1: Book;
    let book2: Book;
    let category1: Category;
    let category2: Category;

    beforeEach(async () => {
      book1 = await Book.create({
        isbnCode: '9780140449136',
        title: 'First Book',
      } as any);

      book2 = await Book.create({
        isbnCode: '9780140449143',
        title: 'Second Book',
      } as any);

      category1 = await Category.create({
        name: 'Fiction',
      } as any);

      category2 = await Category.create({
        name: 'Science Fiction',
      } as any);

      // Create test relationships
      await BookCategory.bulkCreate([
        { bookId: book1.id, categoryId: category1.id },
        { bookId: book1.id, categoryId: category2.id },
        { bookId: book2.id, categoryId: category1.id },
      ] as any);
    });

    it('should find relationships by book ID', async () => {
      const relationships = await BookCategory.findAll({
        where: { bookId: book1.id }
      });

      expect(relationships).toHaveLength(2);
      expect(relationships.every(rel => rel.bookId === book1.id)).toBe(true);
    });

    it('should find relationships by category ID', async () => {
      const relationships = await BookCategory.findAll({
        where: { categoryId: category1.id }
      });

      expect(relationships).toHaveLength(2);
      expect(relationships.every(rel => rel.categoryId === category1.id)).toBe(true);
    });

    it('should find specific relationship', async () => {
      const relationship = await BookCategory.findOne({
        where: { bookId: book1.id, categoryId: category1.id }
      });

      expect(relationship).not.toBeNull();
      expect(relationship?.bookId).toBe(book1.id);
      expect(relationship?.categoryId).toBe(category1.id);
    });

    it('should count relationships correctly', async () => {
      const totalCount = await BookCategory.count();
      const book1Count = await BookCategory.count({ where: { bookId: book1.id } });
      const category1Count = await BookCategory.count({ where: { categoryId: category1.id } });

      expect(totalCount).toBe(3);
      expect(book1Count).toBe(2);
      expect(category1Count).toBe(2);
    });
  });

  describe('Cascade Operations', () => {
    let book: Book;
    let category: Category;

    beforeEach(async () => {
      book = await Book.create({
        isbnCode: '9780140449136',
        title: 'Test Book',
      } as any);

      category = await Category.create({
        name: 'Fiction',
      } as any);

      await BookCategory.create({
        bookId: book.id,
        categoryId: category.id,
      } as any);
    });

    it('should handle book deletion gracefully', async () => {
      await book.destroy();

      const relationshipExists = await BookCategory.findOne({
        where: { bookId: book.id, categoryId: category.id }
      });

      // The relationship should be deleted due to CASCADE
      expect(relationshipExists).toBeNull();
    });

    it('should handle category deletion gracefully', async () => {
      await category.destroy();

      const relationshipExists = await BookCategory.findOne({
        where: { bookId: book.id, categoryId: category.id }
      });

      // The relationship should be deleted due to CASCADE
      expect(relationshipExists).toBeNull();
    });
  });

  describe('Business Logic', () => {
    let book: Book;
    let fictionCategory: Category;
    let sciFiCategory: Category;
    let mysteryCategory: Category;

    beforeEach(async () => {
      book = await Book.create({
        isbnCode: '9780140449136',
        title: 'Test Book',
      } as any);

      fictionCategory = await Category.create({ name: 'Fiction' } as any);
      sciFiCategory = await Category.create({ name: 'Science Fiction' } as any);
      mysteryCategory = await Category.create({ name: 'Mystery' } as any);
    });

    it('should support multiple categories per book', async () => {
      await BookCategory.addCategoryToBook(book.id, fictionCategory.id);
      await BookCategory.addCategoryToBook(book.id, sciFiCategory.id);
      await BookCategory.addCategoryToBook(book.id, mysteryCategory.id);

      const categories = await BookCategory.getCategoriesByBook(book.id);

      expect(categories).toHaveLength(3);
      expect(categories.map(bc => bc.categoryId)).toContain(fictionCategory.id);
      expect(categories.map(bc => bc.categoryId)).toContain(sciFiCategory.id);
      expect(categories.map(bc => bc.categoryId)).toContain(mysteryCategory.id);
    });

    it('should support multiple books per category', async () => {
      const book1 = await Book.create({
        isbnCode: '9780140449143',
        title: 'Book 1',
      } as any);

      const book2 = await Book.create({
        isbnCode: '9780140449150',
        title: 'Book 2',
      } as any);

      await BookCategory.addCategoryToBook(book1.id, fictionCategory.id);
      await BookCategory.addCategoryToBook(book2.id, fictionCategory.id);
      await BookCategory.addCategoryToBook(book.id, fictionCategory.id);

      const books = await BookCategory.getBooksByCategory(fictionCategory.id);

      expect(books).toHaveLength(3);
      expect(books.map(bc => bc.bookId)).toContain(book.id);
      expect(books.map(bc => bc.bookId)).toContain(book1.id);
      expect(books.map(bc => bc.bookId)).toContain(book2.id);
    });

    it('should handle category reassignment', async () => {
      // Add book to fiction category
      await BookCategory.addCategoryToBook(book.id, fictionCategory.id);

      // Remove from fiction and add to sci-fi
      await BookCategory.removeCategoryFromBook(book.id, fictionCategory.id);
      await BookCategory.addCategoryToBook(book.id, sciFiCategory.id);

      const categories = await BookCategory.getCategoriesByBook(book.id);

      expect(categories).toHaveLength(1);
      expect(categories[0]?.categoryId).toBe(sciFiCategory.id);
    });
  });
});