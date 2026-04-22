import { BookController } from '../../../src/controllers/BookController';
import { Book, Author, Category } from '../../../src/models';
import { isbnService } from '../../../src/services/isbnService';
import { BOOK_STATUS } from '@my-many-books/shared-types';
import { container } from '../../../src/container';
import { TYPES } from '../../../src/container/types';
import { BookService } from '../../../src/services/book/BookService';
import { emitHookEvent } from '../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../src/services/hooks/events';
import { UniversalRequest } from '../../../src/types';

// Mock dependencies
jest.mock('../../../src/models', () => ({
  Book: {
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Author: {
    findByPk: jest.fn(),
    findOrCreate: jest.fn(),
    findAndCountAll: jest.fn(),
  },
  Category: {
    findByPk: jest.fn(),
    findOrCreate: jest.fn(),
  },
}));

// Also mock the individual Book model file (used by adapters via @/ alias)
jest.mock('@/models/Book', () => {
  const { Book: MockedBook } = jest.requireMock<typeof import('../../../src/models')>('../../../src/models');
  return {
    Book: MockedBook,
  };
});
jest.mock('../../../src/services/isbnService');
jest.mock('../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

// Container will use real dependency injection

/**
 * Creates a mock object that simulates a Sequelize Model Instance,
 * including the necessary 'get' method for plain object conversion.
 */
const createMockBookInstance = (data: any) => ({
    ...data,
    get: jest.fn().mockImplementation(() => data),
    addAuthors: jest.fn(),
    addCategories: jest.fn(),
    update: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
});

// Mock ISBN validation function
jest.mock('../../../src/utils/isbn', () => ({
  validateIsbn: jest.fn().mockImplementation((isbn) => {
    if (isbn === '9780140449136') {
      return {
        isValid: true,
        normalizedIsbn: '9780140449136',
        format: 'ISBN-13'
      };
    }
    if (isbn === '123') {
      return {
        isValid: false,
        error: 'Invalid ISBN'
      };
    }
    return {
      isValid: true,
      normalizedIsbn: isbn,
      format: 'ISBN-13'
    };
  }),
}));
import { validateIsbn } from '../../../src/utils/isbn';


describe('BookController', () => {
  let bookController: BookController;
  let mockRequest: UniversalRequest;
  let createBookSpy: jest.SpyInstance;
  let updateBookSpy: jest.SpyInstance;
  let deleteBookSpy: jest.SpyInstance;
  const emitHookEventMock = emitHookEvent as jest.MockedFunction<typeof emitHookEvent>;

  beforeEach(() => {
    container.snapshot();
    createBookSpy = jest.spyOn(BookService.prototype, 'createBook');
    updateBookSpy = jest.spyOn(BookService.prototype, 'updateBook');
    deleteBookSpy = jest.spyOn(BookService.prototype, 'deleteBook');
    bookController = container.get<BookController>(TYPES.BookController);
    jest.clearAllMocks();
    emitHookEventMock.mockClear();

    mockRequest = {
      headers: { 'accept-language': 'en' },
    };
  });

  afterEach(() => {
    createBookSpy.mockRestore();
    updateBookSpy.mockRestore();
    deleteBookSpy.mockRestore();
    container.restore();
  });

  describe('createBook', () => {
    const validBookData = {
      title: 'Test Book',
      isbnCode: '9780140449136',
      editionNumber: 1,
      editionDate: '2023-01-01',
      status: BOOK_STATUS.READING,
      notes: 'Test notes',
      authorIds: [1],
      categoryIds: [1],
    };

    const mockAuthors = [{ id: 1, name: 'Author One' }];
    const mockCategories = [{ id: 1, name: 'Fiction' }];
    
    it('should create a book successfully', async () => {
      mockRequest.body = JSON.stringify(validBookData);
      mockRequest.user = { id: 1, email: "test@example.com", role: 'user', provider: "cognito" };

      createBookSpy.mockResolvedValue({
        id: 1,
        title: 'Test Book',
        isbnCode: '9780140449136',
        authors: mockAuthors,
        categories: mockCategories,
      } as any);

      const result = await bookController.createBook(mockRequest);

      expect(createBookSpy).toHaveBeenCalledWith(
        expect.objectContaining(validBookData),
        expect.objectContaining({ userId: 1 })
      );
      expect(result.statusCode).toBe(201);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 1,
        title: 'Test Book',
      });
      expect(emitHookEventMock).toHaveBeenCalledWith(
        EVENTS.BOOK.CREATE.BEFORE,
        expect.objectContaining({
          user: { id: 1, role: 'user' },
          input: expect.objectContaining({ title: 'Test Book' }),
        })
      );
    });

    // Note: ISBN validation is now handled by middleware (validateBody in bookRoutes.ts)
    // Controller no longer validates - it assumes data is already validated by middleware
    // Validation tests should be in the middleware test file instead
  });

  describe('getBook', () => {
    const mockPlainBook = {
      id: 1,
      title: 'Test Book',
      isbnCode: '9780140449136',
      userId: 1,
      bookAuthors: [{ bookId: 1, authorId: 1, author: { id: 1, name: 'Author', surname: 'One' } }],
      bookCategories: [{ bookId: 1, categoryId: 1, category: { id: 1, name: 'Fiction' } }],
    };
    const mockBookInstance = createMockBookInstance(mockPlainBook);

    it('should get a book successfully', async () => {
      (Book.findOne as jest.Mock).mockResolvedValue(mockBookInstance);
      mockRequest.params = { id: '1' };
      mockRequest.user = { id: 1, email: 'test@example.com', role: 'user', provider: 'cognito' };

      const result = await bookController.getBook(mockRequest);

      expect(Book.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, userId: 1 },
        })
      );
      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 1,
        title: 'Test Book',
        authors: [{ id: 1, name: 'Author', surname: 'One' }],
        categories: [{ id: 1, name: 'Fiction' }],
      });
    });

    it('should return 404 if book not found', async () => {
      (Book.findOne as jest.Mock).mockResolvedValue(null);
      mockRequest.params = { id: '999' };
      mockRequest.user = { id: 1, email: 'test@example.com', role: 'user', provider: 'cognito' };

      const result = await bookController.getBook(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Book not found');
    });
  });

  describe('hook events', () => {
    it('emits book.update.before before updating', async () => {
      mockRequest.body = JSON.stringify({ title: 'Updated Title' });
      mockRequest.user = { id: 2, email: "test@example.com", role: 'user', provider: "cognito" };
      mockRequest.params = { id: '5' };
      updateBookSpy.mockResolvedValue({
        id: 5,
        title: 'Updated Title',
      } as any);

      await bookController.updateBook(mockRequest);

      expect(emitHookEventMock).toHaveBeenCalledWith(
        EVENTS.BOOK.UPDATE.BEFORE,
        expect.objectContaining({
          bookId: 5,
          user: { id: 2, role: 'user' },
        })
      );
    });

    it('emits book.delete.before before deleting', async () => {
      mockRequest.params = { id: '9' };
      mockRequest.user = { id: 4, email: "test@example.com", role: 'user', provider: "cognito" };
      deleteBookSpy.mockResolvedValue(undefined);

      await bookController.deleteBook(mockRequest);

      expect(emitHookEventMock).toHaveBeenCalledWith(
        EVENTS.BOOK.DELETE.BEFORE,
        expect.objectContaining({
          bookId: 9,
          user: { id: 4, role: 'user' },
        })
      );
    });
  });

  describe('importBookFromIsbn', () => {
    // Original mock data - book data structure
    const mockBookData = {
      title: 'Imported Book',
      authors: [{ name: 'Test', surname: 'Author' }],
      categories: [{ name: 'Fiction' }],
      isbnCode: '9780140449136',
    };

    // isbnService.lookupBook returns this structure
    const mockIsbnServiceResult = {
      success: true,
      isbn: '9780140449136',
      book: mockBookData,
      source: 'external',
    };

    const mockAuthors = [{ id: 1, name: 'Test Author' }];
    const mockCategories = [{ id: 1, name: 'Fiction' }];
    const mockPlainBook = { 
      id: 2, 
      title: 'Imported Book', 
      isbnCode: '9780140449136', 
      Authors: mockAuthors, 
      Categories: mockCategories 
    };

    const mockBook = createMockBookInstance({ id: 2, title: 'Imported Book' });
    const mockImportedBookInstance = createMockBookInstance(mockPlainBook);

    it('should import book successfully', async () => {
      // Specific cleanup to isolate the isbnService.lookupBook mock.
      jest.clearAllMocks();

      mockRequest.body = JSON.stringify({ isbn: '9780140449136' });
      mockRequest.user = { id: 123, email: 'test@example.com', role: 'user', provider: 'cognito' };

      (validateIsbn as jest.Mock).mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
        format: 'ISBN-13'
      });
      (isbnService.lookupBook as jest.Mock).mockResolvedValue(mockIsbnServiceResult);
      (Author.findOrCreate as jest.Mock).mockResolvedValueOnce([mockAuthors[0], true]);
      (Category.findOrCreate as jest.Mock).mockResolvedValueOnce([mockCategories[0], true]);
      (Book.findOne as jest.Mock).mockResolvedValue(null);
      (Book.create as jest.Mock).mockResolvedValue(mockBook);
      (Book.findByPk as jest.Mock).mockResolvedValue(mockImportedBookInstance);

      const result = await bookController.importBookFromIsbn(mockRequest);

      expect(isbnService.lookupBook).toHaveBeenCalledWith('9780140449136');
      expect(Book.create).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
      expect(result.success).toBe(true);
      // Controller returns { book, source, responseTime }
      expect(result.data).toEqual({
        book: mockPlainBook,
        source: 'external',
        responseTime: undefined,
      });
    });

    it('should return 400 if ISBN is missing', async () => {
      mockRequest.body = JSON.stringify({});
      mockRequest.user = { id: 123, email: 'test@example.com', role: 'user', provider: 'cognito' };

      const result = await bookController.importBookFromIsbn(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('ISBN must be provided');
    });

    it('should require authentication for importBookFromIsbn', async () => {
      mockRequest.body = JSON.stringify({ isbn: '9780140449136' });
      delete mockRequest.user;

      const result = await bookController.importBookFromIsbn(mockRequest);

      expect(result.statusCode).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User authentication required');
    });
  });

  describe('searchBooksByIsbn', () => {
    it('returns found:false when ISBN is not in local DB and external service has no data', async () => {
      jest.spyOn((bookController as any).bookRepository, 'findByIsbnCode').mockResolvedValue(null);
      (isbnService.lookupBook as jest.Mock).mockResolvedValue({ success: false });

      mockRequest.params = { isbn: '9780140449136' };
      mockRequest.user = { id: 2, email: 'test@example.com', role: 'user', provider: 'cognito' };

      const response = await bookController.searchBooksByIsbn(mockRequest);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ found: false });
    });

    it('returns found:true, external:false for a local DB hit', async () => {
      const localBook = { id: 1, isbnCode: '9780140449136', title: 'Iliad', userId: 2 };
      const findByIsbnCodeSpy = jest
        .spyOn((bookController as any).bookRepository, 'findByIsbnCode')
        .mockResolvedValue(localBook);

      mockRequest.params = { isbn: '9780140449136' };
      mockRequest.user = { id: 2, email: 'test@example.com', role: 'user', provider: 'cognito' };

      const response = await bookController.searchBooksByIsbn(mockRequest);

      expect(findByIsbnCodeSpy).toHaveBeenCalledWith('9780140449136', 2);
      expect(response.data).toMatchObject({ found: true, external: false, book: localBook });
      expect(isbnService.lookupBook).not.toHaveBeenCalled();
    });

    it('returns found:true, external:true with auto-created IDs for an external hit', async () => {
      jest.spyOn((bookController as any).bookRepository, 'findByIsbnCode').mockResolvedValue(null);
      (isbnService.lookupBook as jest.Mock).mockResolvedValue({
        success: true,
        book: {
          title: 'Iliad',
          authors: [{ name: 'Homer', surname: '' }],
          categories: [{ name: 'Epic', type: 'subject' }],
          editionDate: '1999',
          description: 'A classic epic',
        },
      });
      (Author.findOrCreate as jest.Mock).mockResolvedValue([{ id: 10 }, true]);
      (Category.findOrCreate as jest.Mock).mockResolvedValue([{ id: 5 }, false]);

      mockRequest.params = { isbn: '9780140449136' };
      mockRequest.user = { id: 2, email: 'test@example.com', role: 'user', provider: 'cognito' };

      const response = await bookController.searchBooksByIsbn(mockRequest);

      expect(response.data).toMatchObject({
        found: true,
        external: true,
        book: {
          title: 'Iliad',
          isbnCode: '9780140449136',
          editionDate: '1999',
          notes: 'A classic epic',
          authorIds: [10],
          createdAuthorIds: [10],
          categoryIds: [5],
          createdCategoryIds: [],
        },
      });
    });

    it('includes cover image URLs in external hit response', async () => {
      jest.spyOn((bookController as any).bookRepository, 'findByIsbnCode').mockResolvedValue(null);
      (isbnService.lookupBook as jest.Mock).mockResolvedValue({
        success: true,
        book: {
          title: 'Iliad',
          authors: [{ name: 'Homer', surname: '' }],
          categories: [],
          coverImageUrlMedium: 'https://covers.openlibrary.org/b/id/1-M.jpg',
          coverImageUrlLarge: 'https://covers.openlibrary.org/b/id/1-L.jpg',
        },
      });
      (Author.findOrCreate as jest.Mock).mockResolvedValue([{ id: 10 }, true]);
      (Category.findOrCreate as jest.Mock).mockResolvedValue([{ id: 5 }, false]);

      mockRequest.params = { isbn: '9780140449136' };
      mockRequest.user = { id: 2, email: 'test@example.com', role: 'user', provider: 'cognito' };

      const response = await bookController.searchBooksByIsbn(mockRequest);

      expect(response.data).toMatchObject({
        found: true,
        external: true,
        book: {
          coverImageUrlMedium: 'https://covers.openlibrary.org/b/id/1-M.jpg',
          coverImageUrlLarge: 'https://covers.openlibrary.org/b/id/1-L.jpg',
        },
      });
    });

    it('passes null cover image URLs when cover is absent from external hit', async () => {
      jest.spyOn((bookController as any).bookRepository, 'findByIsbnCode').mockResolvedValue(null);
      (isbnService.lookupBook as jest.Mock).mockResolvedValue({
        success: true,
        book: {
          title: 'Iliad',
          authors: [{ name: 'Homer', surname: '' }],
          categories: [],
        },
      });
      (Author.findOrCreate as jest.Mock).mockResolvedValue([{ id: 10 }, true]);
      (Category.findOrCreate as jest.Mock).mockResolvedValue([{ id: 5 }, false]);

      mockRequest.params = { isbn: '9780140449136' };
      mockRequest.user = { id: 2, email: 'test@example.com', role: 'user', provider: 'cognito' };

      const response = await bookController.searchBooksByIsbn(mockRequest);

      expect(response.data).toMatchObject({
        found: true,
        external: true,
        book: {
          coverImageUrlMedium: null,
          coverImageUrlLarge: null,
        },
      });
    });
  });

  describe('user-specific methods', () => {
    // ... (rest of user-specific tests)
    it('should require authentication for getUserBooks', async () => {
      delete mockRequest.user;

      const result = await bookController.getUserBooks(mockRequest);

      expect(result.statusCode).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User authentication required');
    });

    it('should call listBooks with user context', async () => {
      mockRequest.user = { id: 123, email: 'test@example.com', role: 'user', provider: 'cognito' };
      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      const result = await bookController.getUserBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
    });

    it('should require authentication for createBookForUser', async () => {
      delete mockRequest.user;

      const result = await bookController.createBookForUser(mockRequest);

      expect(result.statusCode).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User authentication required');
    });
  });

  describe('listBooks with incremental sync', () => {
    beforeEach(() => {
      // Mock Book.findAndCountAll for incremental sync tests
      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });
    });

    it('should support updatedSince parameter for incremental sync', async () => {
      mockRequest.user = { id: 123, email: 'test@example.com', role: 'user', provider: 'cognito' };
      mockRequest.queryStringParameters = { updatedSince: '2024-01-01T00:00:00.000Z' };

      const result = await bookController.listBooks(mockRequest);

      expect(Book.findAndCountAll).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
    });

    it('should work without updatedSince parameter', async () => {
      mockRequest.user = { id: 123, email: 'test@example.com', role: 'user', provider: 'cognito' };
      mockRequest.queryStringParameters = {};

      const result = await bookController.listBooks(mockRequest);

      expect(Book.findAndCountAll).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
    });
  });
});
