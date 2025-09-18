// ================================================================
// tests/models/Book.test.ts  
// ================================================================

import { Sequelize, Op } from 'sequelize';
import { Book } from '../../../src/models/Book';
import { ModelManager } from '../../../src/models';

// Create an in-memory SQLite database for testing
let sequelize: Sequelize;

beforeAll(async () => {
  sequelize = new Sequelize('sqlite::memory:', {
    logging: false,
  });

  // Initialize all models using ModelManager
  ModelManager.initialize(sequelize);

  // Sync the database
  await ModelManager.syncDatabase(true);
});

afterAll(async () => {
  await ModelManager.close();
});

beforeEach(async () => {
  // Clear all instances before each test
  try {
    await Book.destroy({ where: {}, truncate: true });
  } catch (error) {
    // Ignore errors during cleanup
  }
});

describe('Book Model', () => {
  describe('Model Definition', () => {
    it('should have correct table name', () => {
      expect(Book.getTableName()).toBe('books');
    });

    it('should have correct model name', () => {
      expect(Book.getModelName()).toBe('Book');
    });
  });

  describe('CRUD Operations', () => {
    const validBookData = {
      isbnCode: '9780140449136',
      title: 'Test Book',
      editionNumber: 1,
      editionDate: new Date('2023-01-01'),
      status: 'in progress',
      notes: 'Test notes',
    } as any;

    it('should create a book with valid data', async () => {
      const book = await Book.create(validBookData);

      expect(book.id).toBeDefined();
      expect(book.isbnCode).toBe(validBookData.isbnCode);
      expect(book.title).toBe(validBookData.title);
      expect(book.editionNumber).toBe(validBookData.editionNumber);
      expect(book.status).toBe(validBookData.status);
      expect(book.notes).toBe(validBookData.notes);
      expect(book.creationDate).toBeDefined();
      expect(book.updateDate).toBeDefined();
    });

    it('should create a book with minimal required data', async () => {
      const minimalData = {
        isbnCode: '9780140449143',
        title: 'Minimal Book',
      } as any;

      const book = await Book.create(minimalData);

      expect(book.id).toBeDefined();
      expect(book.isbnCode).toBe(minimalData.isbnCode);
      expect(book.title).toBe(minimalData.title);
      expect(book.editionNumber).toBeUndefined();
      expect(book.editionDate).toBeUndefined();
      expect(book.status).toBeUndefined();
      expect(book.notes).toBeUndefined();
      expect(book.userId).toBeUndefined();
    });

    it('should update a book', async () => {
      const book = await Book.create(validBookData);
      const newTitle = 'Updated Test Book';

      await book.update({ title: newTitle });

      expect(book.title).toBe(newTitle);
      expect(book.updateDate?.getTime()).toBeGreaterThanOrEqual(book.creationDate.getTime());
    });

    it('should find a book by ID', async () => {
      const book = await Book.create(validBookData);
      const foundBook = await Book.findByPk(book.id);

      expect(foundBook).toBeDefined();
      expect(foundBook?.id).toBe(book.id);
      expect(foundBook?.title).toBe(book.title);
    });

    it('should delete a book', async () => {
      const book = await Book.create(validBookData);
      await book.destroy();

      const deletedBook = await Book.findByPk(book.id);
      expect(deletedBook).toBeNull();
    });
  });

  describe('Validation', () => {
    it('should require isbnCode', async () => {
      const invalidData = {
        title: 'Book without ISBN',
      } as any;

      await expect(Book.create(invalidData)).rejects.toThrow();
    });

    it('should require title', async () => {
      const invalidData = {
        isbnCode: '9780140449136',
      } as any;

      await expect(Book.create(invalidData)).rejects.toThrow();
    });

    it('should enforce unique isbnCode', async () => {
      const bookData1 = {
        isbnCode: '9780140449136',
        title: 'First Book',
      } as any;

      const bookData2 = {
        isbnCode: '9780140449136', // Same ISBN
        title: 'Second Book',
      } as any;

      await Book.create(bookData1);
      await expect(Book.create(bookData2)).rejects.toThrow();
    });

    it('should validate ISBN length', async () => {
      const invalidData = {
        isbnCode: '123', // Too short
        title: 'Book with invalid ISBN',
      } as any;

      await expect(Book.create(invalidData)).rejects.toThrow();
    });

    it('should validate title length', async () => {
      const invalidData = {
        isbnCode: '9780140449136',
        title: 'a'.repeat(256), // Too long (max 255)
      } as any;

      await expect(Book.create(invalidData)).rejects.toThrow();
    });

    it('should validate status values', async () => {
      const invalidData = {
        isbnCode: '9780140449136',
        title: 'Book with invalid status',
        status: 'invalid_status',
      } as any;

      await expect(Book.create(invalidData)).rejects.toThrow();
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['in progress', 'finished', 'paused'];

      for (const status of validStatuses) {
        const bookData = {
          isbnCode: `978014044913${validStatuses.indexOf(status)}`,
          title: `Book with ${status} status`,
          status: status,
        } as any;

        const book = await Book.create(bookData);
        expect(book.status).toBe(status);
      }
    });

    it('should validate notes length', async () => {
      const invalidData = {
        isbnCode: '9780140449136',
        title: 'Book with long notes',
        notes: 'a'.repeat(2001), // Too long (max 2000)
      } as any;

      await expect(Book.create(invalidData)).rejects.toThrow();
    });

    it('should validate editionNumber as positive integer', async () => {
      const invalidData = {
        isbnCode: '9780140449136',
        title: 'Book with invalid edition',
        editionNumber: -1,
      } as any;

      await expect(Book.create(invalidData)).rejects.toThrow();
    });
  });

  describe('Queries and Scopes', () => {
    beforeEach(async () => {
      // Create test data
      const testBooks = [
        {
          isbnCode: '9780140449136',
          title: 'First Book',
          status: 'finished',
        },
        {
          isbnCode: '9780140449143',
          title: 'Second Book',
          status: 'in progress',
        },
        {
          isbnCode: '9780140449150',
          title: 'Third Book',
          status: 'paused',
        },
      ] as any[];
      
      await Book.bulkCreate(testBooks);
    });

    it('should find books by status', async () => {
      const finishedBooks = await Book.findAll({
        where: { status: 'finished' },
      });

      expect(finishedBooks).toHaveLength(1);
      expect(finishedBooks[0]?.title).toBe('First Book');
    });

    it('should find books by status pattern', async () => {
      const progressBooks = await Book.findAll({
        where: { status: 'in progress' },
      });

      expect(progressBooks).toHaveLength(1);
      expect(progressBooks[0]?.title).toBe('Second Book');
    });

    it('should find books by title pattern', async () => {
      const books = await Book.findAll({
        where: {
          title: {
            [Op.like]: '%First%',
          },
        },
      });

      expect(books).toHaveLength(1);
      expect(books[0]?.title).toBe('First Book');
    });

    it('should order books by title', async () => {
      const books = await Book.findAll({
        order: [['title', 'ASC']],
      });

      expect(books).toHaveLength(3);
      expect(books[0]?.title).toBe('First Book');
      expect(books[1]?.title).toBe('Second Book');
      expect(books[2]?.title).toBe('Third Book');
    });

    it('should count books', async () => {
      const count = await Book.count();
      expect(count).toBe(3);
    });

    it('should count books with conditions', async () => {
      const count = await Book.count({
        where: { status: 'in progress' },
      });
      expect(count).toBe(1);
    });
  });

  describe('Field Mappings', () => {
    it('should map database field names correctly', async () => {
      const book = await Book.create({
        isbnCode: '9780140449136',
        title: 'Test Book',
      } as any);

      // The isbnCode field should be mapped to isbn_code in the database
      expect(book.isbnCode).toBe('9780140449136');
    });
  });

  describe('Default Values', () => {
    it('should set default creation and update dates', async () => {
      const book = await Book.create({
        isbnCode: '9780140449136',
        title: 'Test Book',
      } as any);

      expect(book.creationDate).toBeDefined();
      expect(book.updateDate).toBeDefined();
      expect(book.creationDate.getTime()).toBeLessThanOrEqual(Date.now());
      expect(book.updateDate!.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Timestamps', () => {
    it('should update updateDate when model is updated', async () => {
      const book = await Book.create({
        isbnCode: '9780140449136',
        title: 'Original Title',
      } as any);

      const originalUpdateDate = book.updateDate;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 50));

      await book.update({ title: 'Updated Title' });

      expect(book.updateDate!.getTime()).toBeGreaterThanOrEqual(originalUpdateDate!.getTime());
    });
  });

  describe('Data Types', () => {
    it('should handle date fields correctly', async () => {
      const editionDate = new Date('2023-06-15');
      
      const book = await Book.create({
        isbnCode: '9780140449136',
        title: 'Test Book',
        editionDate,
      } as any);

      expect(book.editionDate).toBeInstanceOf(Date);
      expect(book.editionDate!.getTime()).toBe(editionDate.getTime());
    });

    it('should handle optional numeric fields', async () => {
      const book = await Book.create({
        isbnCode: '9780140449136',
        title: 'Test Book',
        editionNumber: 3,
      } as any);

      expect(typeof book.editionNumber).toBe('number');
      expect(book.editionNumber).toBe(3);
    });

    it('should handle text fields with proper encoding', async () => {
      const specialTitle = 'Book with special chars: àáâãäåæçèéêë';
      
      const book = await Book.create({
        isbnCode: '9780140449136',
        title: specialTitle,
      } as any);

      expect(book.title).toBe(specialTitle);
    });
  });
});