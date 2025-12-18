import { BookController } from '../../../src/controllers/BookController';
import { Book, Author, Category } from '../../../src/models';
import { isbnService } from '../../../src/services/isbnService';
import { BOOK_STATUS } from '@my-many-books/shared-validation';
import { container } from '../../../src/container';
import { TYPES } from '../../../src/container/types';
import { BookService } from '../../../src/services/book/BookService';
import { emitHookEvent } from '../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../src/services/hooks/events';

// Mock dependencies
jest.mock('../../../src/models');
jest.mock('../../../src/services/isbnService');
jest.mock('../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

interface UniversalRequest {
  body?: any;
  queryStringParameters?: { [key: string]: string | undefined };
  pathParameters?: { [key: string]: string | undefined };
  headers?: { [key: string]: string | undefined };
  user?: { id: number; role?: string };
}

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
      mockRequest.user?: { id: 1, role: 'user' };

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
      Authors: [{ id: 1, name: 'Author One' }],
      Categories: [{ id: 1, name: 'Fiction' }],
    };
    // The book instance returned by findOne
    const mockBookInstance = createMockBookInstance(mockPlainBook);

    it('should get a book successfully', async () => {
      (Book.findOne as jest.Mock).mockResolvedValue(mockBookInstance);
      mockRequest.pathParameters = { id: '1' };

      const result = await bookController.getBook(mockRequest);

      expect(Book.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
        })
      );
      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPlainBook);
    });

    it('should return 404 if book not found', async () => {
      (Book.findOne as jest.Mock).mockResolvedValue(null);
      mockRequest.pathParameters = { id: '999' };

      const result = await bookController.getBook(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Book not found');
    });
  });

  describe('hook events', () => {
    it('emits book.update.before before updating', async () => {
      mockRequest.body = JSON.stringify({ title: 'Updated Title' });
      mockRequest.user?: { id: 2, role: 'user' };
      mockRequest.pathParameters = { id: '5' };
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
      mockRequest.user?: { id: 4, role: 'user' };
      mockRequest.pathParameters = { id: '9' };
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

      const result = await bookController.importBookFromIsbn(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('ISBN must be provided');
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
      mockRequest.user?: { id: 123 };
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
});
