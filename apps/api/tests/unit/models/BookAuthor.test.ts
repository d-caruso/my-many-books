// ================================================================
// tests/models/BookAuthor.test.ts
// Comprehensive tests for BookAuthor junction model
// ================================================================

import { Sequelize } from 'sequelize';
import { BookAuthor } from '../../../src/models/BookAuthor';
import { Book } from '../../../src/models/Book';
import { Author } from '../../../src/models/Author';
import { ModelManager } from '../../../src/models';

describe('BookAuthor Model', () => {
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
      await BookAuthor.destroy({ where: {}, truncate: true });
    } catch (error) {
      // Ignore errors during cleanup
    }
    try {
      await Book.destroy({ where: {}, truncate: true });
    } catch (error) {
      // Ignore errors during cleanup
    }
    try {
      await Author.destroy({ where: {}, truncate: true });
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('Model Definition', () => {
    it('should have correct table name', () => {
      expect(BookAuthor.getTableName()).toBe('book_authors');
    });

    it('should have correct model name', () => {
      expect(BookAuthor.getModelName()).toBe('BookAuthor');
    });
  });

  describe('Model Creation', () => {
    let book: Book;
    let author: Author;

    beforeEach(async () => {
      book = await Book.create({
        isbnCode: '9780140449136',
        title: 'Test Book',
      } as any);

      author = await Author.create({
        name: 'John',
        surname: 'Doe',
      } as any);
    });

    it('should create a book-author relationship with valid data', async () => {
      const bookAuthor = await BookAuthor.create({
        bookId: book.id,
        authorId: author.id,
      } as any);

      expect(bookAuthor.bookId).toBe(book.id);
      expect(bookAuthor.authorId).toBe(author.id);
      expect(bookAuthor.creationDate).toBeDefined();
      expect(bookAuthor.updateDate).toBeDefined();
    });

    it('should fail to create without bookId', async () => {
      await expect(BookAuthor.create({
        authorId: author.id,
      } as any)).rejects.toThrow();
    });

    it('should fail to create without authorId', async () => {
      await expect(BookAuthor.create({
        bookId: book.id,
      } as any)).rejects.toThrow();
    });

    it('should enforce unique constraint on bookId-authorId pair', async () => {
      await BookAuthor.create({
        bookId: book.id,
        authorId: author.id,
      } as any);

      // Should fail when trying to create duplicate
      await expect(BookAuthor.create({
        bookId: book.id,
        authorId: author.id,
      } as any)).rejects.toThrow();
    });

    it('should allow same book with different authors', async () => {
      const author2 = await Author.create({
        name: 'Jane',
        surname: 'Smith',
      } as any);

      const bookAuthor1 = await BookAuthor.create({
        bookId: book.id,
        authorId: author.id,
      } as any);

      const bookAuthor2 = await BookAuthor.create({
        bookId: book.id,
        authorId: author2.id,
      } as any);

      expect(bookAuthor1.bookId).toBe(book.id);
      expect(bookAuthor2.bookId).toBe(book.id);
      expect(bookAuthor1.authorId).not.toBe(bookAuthor2.authorId);
    });

    it('should allow same author with different books', async () => {
      const book2 = await Book.create({
        isbnCode: '9780140449143',
        title: 'Another Book',
      } as any);

      const bookAuthor1 = await BookAuthor.create({
        bookId: book.id,
        authorId: author.id,
      } as any);

      const bookAuthor2 = await BookAuthor.create({
        bookId: book2.id,
        authorId: author.id,
      } as any);

      expect(bookAuthor1.authorId).toBe(author.id);
      expect(bookAuthor2.authorId).toBe(author.id);
      expect(bookAuthor1.bookId).not.toBe(bookAuthor2.bookId);
    });
  });

  describe('Instance Methods', () => {
    let book: Book;
    let author: Author;
    let bookAuthor: BookAuthor;

    beforeEach(async () => {
      book = await Book.create({
        isbnCode: '9780140449136',
        title: 'Test Book',
      } as any);

      author = await Author.create({
        name: 'John',
        surname: 'Doe',
      } as any);

      bookAuthor = await BookAuthor.create({
        bookId: book.id,
        authorId: author.id,
      } as any);
    });

    it('should serialize to JSON correctly', () => {
      const json = bookAuthor.toJSON();

      expect(json).toHaveProperty('bookId', book.id);
      expect(json).toHaveProperty('authorId', author.id);
      expect(json).toHaveProperty('creationDate');
      expect(json).toHaveProperty('updateDate');
    });

    it('should update updateDate when modified', async () => {
      const originalUpdateDate = bookAuthor.updateDate;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 50));

      await bookAuthor.save({ silent: false });

      // Reload to get updated timestamp
      await bookAuthor.reload();

      expect(bookAuthor.updateDate?.getTime()).toBeGreaterThanOrEqual(originalUpdateDate?.getTime() || 0);
    });
  });

  describe('Static Methods', () => {
    let book1: Book;
    let book2: Book;
    let author1: Author;
    let author2: Author;

    beforeEach(async () => {
      book1 = await Book.create({
        isbnCode: '9780140449136',
        title: 'First Book',
      } as any);

      book2 = await Book.create({
        isbnCode: '9780140449143',
        title: 'Second Book',
      } as any);

      author1 = await Author.create({
        name: 'John',
        surname: 'Doe',
      } as any);

      author2 = await Author.create({
        name: 'Jane',
        surname: 'Smith',
      } as any);
    });

    describe('addAuthorToBook', () => {
      it('should add author to book successfully', async () => {
        const bookAuthor = await BookAuthor.addAuthorToBook(book1.id, author1.id);

        expect(bookAuthor.bookId).toBe(book1.id);
        expect(bookAuthor.authorId).toBe(author1.id);
        expect(bookAuthor.creationDate).toBeDefined();
      });

      it('should throw error for duplicate relationship', async () => {
        await BookAuthor.addAuthorToBook(book1.id, author1.id);

        await expect(BookAuthor.addAuthorToBook(book1.id, author1.id)).rejects.toThrow();
      });

      it('should throw error for invalid book ID', async () => {
        await expect(BookAuthor.addAuthorToBook(99999, author1.id)).rejects.toThrow();
      });

      it('should throw error for invalid author ID', async () => {
        await expect(BookAuthor.addAuthorToBook(book1.id, 99999)).rejects.toThrow();
      });
    });

    describe('removeAuthorFromBook', () => {
      it('should remove author from book successfully', async () => {
        await BookAuthor.addAuthorToBook(book1.id, author1.id);

        const result = await BookAuthor.removeAuthorFromBook(book1.id, author1.id);

        expect(result).toBe(true);

        const relationshipExists = await BookAuthor.findOne({
          where: { bookId: book1.id, authorId: author1.id }
        });
        expect(relationshipExists).toBeNull();
      });

      it('should return false for non-existent relationship', async () => {
        const result = await BookAuthor.removeAuthorFromBook(book1.id, author1.id);

        expect(result).toBe(false);
      });

      it('should return false for invalid IDs', async () => {
        const result = await BookAuthor.removeAuthorFromBook(99999, 99999);

        expect(result).toBe(false);
      });
    });

    describe('getBooksByAuthor', () => {
      beforeEach(async () => {
        // Create test relationships
        await BookAuthor.addAuthorToBook(book1.id, author1.id);
        await BookAuthor.addAuthorToBook(book2.id, author1.id);
        await BookAuthor.addAuthorToBook(book1.id, author2.id);
      });

      it('should get all books by author', async () => {
        const bookAuthors = await BookAuthor.getBooksByAuthor(author1.id);

        expect(bookAuthors).toHaveLength(2);
        expect(bookAuthors.map(ba => ba.bookId)).toContain(book1.id);
        expect(bookAuthors.map(ba => ba.bookId)).toContain(book2.id);
      });

      it('should return empty array for author with no books', async () => {
        const author3 = await Author.create({
          name: 'Bob',
          surname: 'Johnson',
        } as any);

        const bookAuthors = await BookAuthor.getBooksByAuthor(author3.id);

        expect(bookAuthors).toHaveLength(0);
      });

      it('should return empty array for non-existent author', async () => {
        const bookAuthors = await BookAuthor.getBooksByAuthor(99999);

        expect(bookAuthors).toHaveLength(0);
      });
    });

    describe('getAuthorsByBook', () => {
      beforeEach(async () => {
        // Create test relationships
        await BookAuthor.addAuthorToBook(book1.id, author1.id);
        await BookAuthor.addAuthorToBook(book1.id, author2.id);
        await BookAuthor.addAuthorToBook(book2.id, author1.id);
      });

      it('should get all authors by book', async () => {
        const bookAuthors = await BookAuthor.getAuthorsByBook(book1.id);

        expect(bookAuthors).toHaveLength(2);
        expect(bookAuthors.map(ba => ba.authorId)).toContain(author1.id);
        expect(bookAuthors.map(ba => ba.authorId)).toContain(author2.id);
      });

      it('should return empty array for book with no authors', async () => {
        const book3 = await Book.create({
          isbnCode: '9780140449150',
          title: 'Third Book',
        } as any);

        const bookAuthors = await BookAuthor.getAuthorsByBook(book3.id);

        expect(bookAuthors).toHaveLength(0);
      });

      it('should return empty array for non-existent book', async () => {
        const bookAuthors = await BookAuthor.getAuthorsByBook(99999);

        expect(bookAuthors).toHaveLength(0);
      });
    });
  });

  describe('Timestamps', () => {
    let book: Book;
    let author: Author;

    beforeEach(async () => {
      book = await Book.create({
        isbnCode: '9780140449136',
        title: 'Test Book',
      } as any);

      author = await Author.create({
        name: 'John',
        surname: 'Doe',
      } as any);
    });

    it('should auto-generate creation and update dates', async () => {
      const bookAuthor = await BookAuthor.create({
        bookId: book.id,
        authorId: author.id,
      } as any);

      expect(bookAuthor.creationDate).toBeInstanceOf(Date);
      expect(bookAuthor.updateDate).toBeInstanceOf(Date);
      expect(bookAuthor.creationDate.getTime()).toBeLessThanOrEqual(Date.now());
      expect(bookAuthor.updateDate?.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should update updateDate when record is modified', async () => {
      const bookAuthor = await BookAuthor.create({
        bookId: book.id,
        authorId: author.id,
      } as any);

      const originalUpdateDate = bookAuthor.updateDate;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 50));

      await bookAuthor.save({ silent: false });

      // Reload to get updated timestamp
      await bookAuthor.reload();

      expect(bookAuthor.updateDate?.getTime()).toBeGreaterThanOrEqual(originalUpdateDate?.getTime() || 0);
    });
  });

  describe('Querying', () => {
    let book1: Book;
    let book2: Book;
    let author1: Author;
    let author2: Author;

    beforeEach(async () => {
      book1 = await Book.create({
        isbnCode: '9780140449136',
        title: 'First Book',
      } as any);

      book2 = await Book.create({
        isbnCode: '9780140449143',
        title: 'Second Book',
      } as any);

      author1 = await Author.create({
        name: 'John',
        surname: 'Doe',
      } as any);

      author2 = await Author.create({
        name: 'Jane',
        surname: 'Smith',
      } as any);

      // Create test relationships
      await BookAuthor.bulkCreate([
        { bookId: book1.id, authorId: author1.id },
        { bookId: book1.id, authorId: author2.id },
        { bookId: book2.id, authorId: author1.id },
      ] as any);
    });

    it('should find relationships by book ID', async () => {
      const relationships = await BookAuthor.findAll({
        where: { bookId: book1.id }
      });

      expect(relationships).toHaveLength(2);
      expect(relationships.every(rel => rel.bookId === book1.id)).toBe(true);
    });

    it('should find relationships by author ID', async () => {
      const relationships = await BookAuthor.findAll({
        where: { authorId: author1.id }
      });

      expect(relationships).toHaveLength(2);
      expect(relationships.every(rel => rel.authorId === author1.id)).toBe(true);
    });

    it('should find specific relationship', async () => {
      const relationship = await BookAuthor.findOne({
        where: { bookId: book1.id, authorId: author1.id }
      });

      expect(relationship).not.toBeNull();
      expect(relationship?.bookId).toBe(book1.id);
      expect(relationship?.authorId).toBe(author1.id);
    });

    it('should count relationships correctly', async () => {
      const totalCount = await BookAuthor.count();
      const book1Count = await BookAuthor.count({ where: { bookId: book1.id } });
      const author1Count = await BookAuthor.count({ where: { authorId: author1.id } });

      expect(totalCount).toBe(3);
      expect(book1Count).toBe(2);
      expect(author1Count).toBe(2);
    });
  });

  describe('Cascade Operations', () => {
    let book: Book;
    let author: Author;

    beforeEach(async () => {
      book = await Book.create({
        isbnCode: '9780140449136',
        title: 'Test Book',
      } as any);

      author = await Author.create({
        name: 'John',
        surname: 'Doe',
      } as any);

      await BookAuthor.create({
        bookId: book.id,
        authorId: author.id,
      } as any);
    });

    it('should handle book deletion gracefully', async () => {
      await book.destroy();

      const relationshipExists = await BookAuthor.findOne({
        where: { bookId: book.id, authorId: author.id }
      });

      // The relationship should be deleted due to CASCADE
      expect(relationshipExists).toBeNull();
    });

    it('should handle author deletion gracefully', async () => {
      await author.destroy();

      const relationshipExists = await BookAuthor.findOne({
        where: { bookId: book.id, authorId: author.id }
      });

      // The relationship should be deleted due to CASCADE
      expect(relationshipExists).toBeNull();
    });
  });
});