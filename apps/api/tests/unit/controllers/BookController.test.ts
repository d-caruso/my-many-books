// ================================================================
// tests/controllers/BookController.test.ts
// ================================================================

import { BookController } from '../../../src/controllers/BookController';
import { Book, Author, Category } from '../../../src/models';
import { isbnService } from '../../../src/services/isbnService';
import { BOOK_STATUS } from '../../../src/utils/constants';

// Mock dependencies
jest.mock('../../../src/models');
jest.mock('../../../src/services/isbnService');

interface UniversalRequest {
  body?: any;
  queryStringParameters?: { [key: string]: string | undefined };
  pathParameters?: { [key: string]: string | undefined };
  user?: { userId: number };
}

describe('BookController', () => {
  let bookController: BookController;
  let mockRequest: UniversalRequest;

  beforeEach(() => {
    bookController = new BookController();
    jest.clearAllMocks();

    mockRequest = {};
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

    it('should create a book successfully', async () => {
      const mockBook = { 
        id: 1, 
        addAuthors: jest.fn(),
        addCategories: jest.fn()
      };
      const mockCreatedBook = { id: 1, title: 'Test Book', Authors: [], Categories: [] };
      const mockAuthors = [{ id: 1 }];
      const mockCategories = [{ id: 1 }];

      (Book.findOne as jest.Mock).mockResolvedValue(null);
      (Author.findAll as jest.Mock).mockResolvedValue(mockAuthors);
      (Category.findAll as jest.Mock).mockResolvedValue(mockCategories);
      (Book.create as jest.Mock).mockResolvedValue(mockBook);
      (Book.findByPk as jest.Mock).mockResolvedValue(mockCreatedBook);

      mockRequest.body = JSON.stringify(validBookData);

      const result = await bookController.createBook(mockRequest);

      expect(result.statusCode).toBe(201);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Book created successfully');
      expect(result.data).toEqual(mockCreatedBook);
    });

    it('should return 400 for missing request body', async () => {
      mockRequest.body = undefined;

      const result = await bookController.createBook(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Request body is required');
    });

    it('should return 400 for validation errors', async () => {
      const invalidData = { title: '' }; // Missing required fields

      mockRequest.body = JSON.stringify(invalidData);

      const result = await bookController.createBook(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    it('should return 409 for duplicate ISBN', async () => {
      (Book.findOne as jest.Mock).mockResolvedValue({ id: 2, isbnCode: '9780140449136' });

      mockRequest.body = JSON.stringify(validBookData);

      const result = await bookController.createBook(mockRequest);

      expect(result.statusCode).toBe(409);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Book with this ISBN already exists');
    });
  });

  describe('getBook', () => {
    it('should get a book successfully', async () => {
      const mockBook = {
        id: 1,
        title: 'Test Book',
        Authors: [],
        Categories: [],
      };

      (Book.findOne as jest.Mock).mockResolvedValue(mockBook);

      mockRequest.pathParameters = { id: '1' };

      const result = await bookController.getBook(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBook);
    });

    it('should return 400 for invalid book ID', async () => {
      mockRequest.pathParameters = { id: 'invalid' };

      const result = await bookController.getBook(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Valid book ID is required');
    });

    it('should return 404 for non-existent book', async () => {
      (Book.findOne as jest.Mock).mockResolvedValue(null);

      mockRequest.pathParameters = { id: '999' };

      const result = await bookController.getBook(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Book not found');
    });
  });

  describe('updateBook', () => {
    const updateData = {
      title: 'Updated Title',
      notes: 'Updated notes',
    };

    it('should update a book successfully', async () => {
      const mockBook = {
        id: 1,
        title: 'Original Title',
        isbnCode: '9780140449136',
        update: jest.fn(),
      };

      const mockUpdatedBook = {
        id: 1,
        title: 'Updated Title',
        notes: 'Updated notes',
        Authors: [],
        Categories: [],
      };

      (Book.findOne as jest.Mock).mockResolvedValue(mockBook);
      (Book.findByPk as jest.Mock).mockResolvedValue(mockUpdatedBook);

      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify(updateData);

      const result = await bookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Book updated successfully');
      expect(mockBook.update).toHaveBeenCalled();
    });

    it('should return 404 for non-existent book', async () => {
      (Book.findOne as jest.Mock).mockResolvedValue(null);

      mockRequest.pathParameters = { id: '999' };
      mockRequest.body = JSON.stringify(updateData);

      const result = await bookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Book not found');
    });
  });

  describe('deleteBook', () => {
    it('should delete a book successfully', async () => {
      const mockBook = {
        id: 1,
        destroy: jest.fn(),
      };

      (Book.findOne as jest.Mock).mockResolvedValue(mockBook);

      mockRequest.pathParameters = { id: '1' };

      const result = await bookController.deleteBook(mockRequest);

      expect(result.statusCode).toBe(204);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Book deleted successfully');
      expect(mockBook.destroy).toHaveBeenCalled();
    });
  });

  describe('listBooks', () => {
    it('should list books with pagination', async () => {
      const mockBooks = [
        { id: 1, title: 'Book 1', Authors: [], Categories: [] },
        { id: 2, title: 'Book 2', Authors: [], Categories: [] },
      ];

      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 2,
        rows: mockBooks,
      });

      mockRequest.queryStringParameters = { page: '1', limit: '10' };

      const result = await bookController.listBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBooks);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('should handle search filters', async () => {
      const filters = { 
        title: 'Test Book Title',
        isbnCode: '9780140449136' 
      }; // Use valid filter format
      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 1,
        rows: [{ id: 1, title: 'Test Book', Authors: [], Categories: [] }],
      });

      mockRequest.queryStringParameters = {
        filters: JSON.stringify(filters),
      };

      const result = await bookController.listBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
    });
  });

  describe('searchBooksByIsbn', () => {
    it('should find book in local database', async () => {
      const mockBook = {
        id: 1,
        isbnCode: '9780140449136',
        title: 'Local Book',
        Authors: [],
        Categories: [],
      };

      (Book.findOne as jest.Mock).mockResolvedValue(mockBook);

      mockRequest.queryStringParameters = { isbn: '9780140449136' };

      const result = await bookController.searchBooksByIsbn(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as { source: string; book: unknown }).source).toBe('local');
      expect((result.data as { source: string; book: unknown }).book).toEqual(mockBook);
    });

    it('should search external service when not found locally', async () => {
      const mockExternalResult = {
        success: true,
        book: { title: 'External Book' },
        source: 'api',
      };

      (Book.findOne as jest.Mock).mockResolvedValue(null);
      (isbnService.lookupBook as jest.Mock).mockResolvedValue(mockExternalResult);

      mockRequest.queryStringParameters = { isbn: '9780140449136' };

      const result = await bookController.searchBooksByIsbn(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as { source: string; book: unknown }).source).toBe('api');
      expect((result.data as { source: string; book: unknown }).book).toEqual(mockExternalResult.book);
    });
  });

  describe('importBookFromIsbn', () => {
    it('should import book successfully', async () => {
      const mockIsbnResult = {
        success: true,
        book: {
          title: 'Imported Book',
          authors: [{ name: 'Test', surname: 'Author' }],
          categories: [{ name: 'Fiction' }],
          isbnCode: '9780140449136',
        },
        source: 'api',
        responseTime: 100,
      };

      const mockCreatedBook = { id: 1, title: 'Imported Book' };

      (Book.findOne as jest.Mock).mockResolvedValue(null);
      (isbnService.lookupBook as jest.Mock).mockResolvedValue(mockIsbnResult);
      (Book.create as jest.Mock).mockResolvedValue({
        id: 1,
        addAuthors: jest.fn(),
        addCategories: jest.fn(),
      });
      (Author.findOrCreate as jest.Mock).mockResolvedValue([{ id: 1 }]);
      (Category.findOrCreate as jest.Mock).mockResolvedValue([{ id: 1 }]);
      (Book.findByPk as jest.Mock).mockResolvedValue(mockCreatedBook);

      mockRequest.body = JSON.stringify({ isbn: '9780140449136' });

      const result = await bookController.importBookFromIsbn(mockRequest);

      expect(result.statusCode).toBe(201);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Book imported successfully');
    });

    it('should return 409 for existing ISBN', async () => {
      (Book.findOne as jest.Mock).mockResolvedValue({ id: 1 });

      mockRequest.body = JSON.stringify({ isbn: '9780140449136' });

      const result = await bookController.importBookFromIsbn(mockRequest);

      expect(result.statusCode).toBe(409);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Book with this ISBN already exists');
    });

    it('should return 400 for invalid ISBN format', async () => {
      mockRequest.body = JSON.stringify({ isbn: 'invalid-isbn' });

      const result = await bookController.importBookFromIsbn(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid ISBN');
    });

    it('should return 404 when external service fails', async () => {
      const mockIsbnResult = {
        success: false,
        error: 'Book not found in external service',
      };

      (Book.findOne as jest.Mock).mockResolvedValue(null);
      (isbnService.lookupBook as jest.Mock).mockResolvedValue(mockIsbnResult);

      mockRequest.body = JSON.stringify({ isbn: '9780140449136' });

      const result = await bookController.importBookFromIsbn(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Book not found in external service');
    });
  });

  describe('createBook - author and category validation', () => {
    const validBookData = {
      title: 'Test Book',
      isbnCode: '9780140449136',
      authorIds: [1, 2],
      categoryIds: [1],
    };

    it('should return 400 for invalid author IDs', async () => {
      (Book.findOne as jest.Mock).mockResolvedValue(null);
      (Author.findAll as jest.Mock).mockResolvedValue([{ id: 1 }]); // Only one author found
      
      mockRequest.body = JSON.stringify(validBookData);

      const result = await bookController.createBook(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('One or more author IDs are invalid');
    });

    it('should return 400 for invalid category IDs', async () => {
      const bookDataWithInvalidCategories = {
        title: 'Test Book',
        isbnCode: '9780140449136',
        categoryIds: [1, 99], // Invalid category ID
      };
      
      (Book.findOne as jest.Mock).mockResolvedValue(null);
      (Category.findAll as jest.Mock).mockResolvedValue([{ id: 1 }]); // Only one category found, not both
      
      mockRequest.body = JSON.stringify(bookDataWithInvalidCategories);

      const result = await bookController.createBook(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('One or more category IDs are invalid');
    });

    it('should create book without authors or categories', async () => {
      const bookDataWithoutAssociations = {
        title: 'Test Book',
        isbnCode: '9780140449136',
      };
      
      const mockBook = { 
        id: 1, 
        addAuthors: jest.fn(),
        addCategories: jest.fn()
      };
      const mockCreatedBook = { id: 1, title: 'Test Book', Authors: [], Categories: [] };

      (Book.findOne as jest.Mock).mockResolvedValue(null);
      (Book.create as jest.Mock).mockResolvedValue(mockBook);
      (Book.findByPk as jest.Mock).mockResolvedValue(mockCreatedBook);

      mockRequest.body = JSON.stringify(bookDataWithoutAssociations);

      const result = await bookController.createBook(mockRequest);

      expect(result.statusCode).toBe(201);
      expect(result.success).toBe(true);
      expect(mockBook.addAuthors).not.toHaveBeenCalled();
      expect(mockBook.addCategories).not.toHaveBeenCalled();
    });
  });

  describe('updateBook - associations', () => {
    const mockBook = {
      id: 1,
      update: jest.fn(),
      setAuthors: jest.fn(),
      setCategories: jest.fn(),
    };

    beforeEach(() => {
      (Book.findOne as jest.Mock).mockResolvedValue(mockBook);
      (Book.findByPk as jest.Mock).mockResolvedValue({ id: 1, Authors: [], Categories: [] });
    });

    it('should update book with author associations', async () => {
      const updateData = {
        title: 'Updated Title',
        authorIds: [1, 2],
      };
      
      (Author.findAll as jest.Mock).mockResolvedValue([{ id: 1 }, { id: 2 }]);
      
      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify(updateData);

      const result = await bookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(Author.findAll).toHaveBeenCalledWith({
        where: { id: [1, 2] },
        attributes: ['id'],
      });
      expect(mockBook.setAuthors).toHaveBeenCalled();
    });

    it('should clear associations when empty arrays provided', async () => {
      const updateData = {
        title: 'Updated Title',
        authorIds: [],
        categoryIds: [],
      };
      
      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify(updateData);

      const result = await bookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(mockBook.setAuthors).toHaveBeenCalledWith([]);
      expect(mockBook.setCategories).toHaveBeenCalledWith([]);
    });
  });

  describe('listBooks - filters and pagination', () => {
    beforeEach(() => {
      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 1,
        rows: [{ id: 1, title: 'Test Book', Authors: [], Categories: [] }],
      });
    });

    it('should handle invalid filter JSON', async () => {
      mockRequest.queryStringParameters = {
        filters: 'invalid-json',
      };

      const result = await bookController.listBooks(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid filters format. Expected JSON string.');
    });

    it('should handle invalid filter validation', async () => {
      const invalidFilters = {
        title: '', // Too short
        isbnCode: 'invalid',
      };
      
      mockRequest.queryStringParameters = {
        filters: JSON.stringify(invalidFilters),
      };

      const result = await bookController.listBooks(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid search filters');
    });

    it('should include authors and categories when requested', async () => {
      mockRequest.queryStringParameters = {
        includeAuthors: 'true',
        includeCategories: 'true',
      };

      const result = await bookController.listBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(Book.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({ model: Author }),
          expect.objectContaining({ model: Category }),
        ]),
      }));
    });

    it('should apply user filter when user is authenticated', async () => {
      mockRequest.user = { userId: 123 };
      mockRequest.queryStringParameters = { page: '1', limit: '10' };

      const result = await bookController.listBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(Book.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          [Symbol.for('and')]: expect.arrayContaining([
            expect.objectContaining({ userId: 123 })
          ])
        })
      }));
    });
  });

  describe('searchBooksByIsbn - validation', () => {
    it('should return 400 when ISBN parameter is missing', async () => {
      mockRequest.queryStringParameters = {};

      const result = await bookController.searchBooksByIsbn(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('ISBN parameter is required');
    });

    it('should return 400 for invalid ISBN format', async () => {
      mockRequest.queryStringParameters = { isbn: 'invalid-isbn' };

      const result = await bookController.searchBooksByIsbn(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid ISBN');
    });

    it('should return error from external service', async () => {
      const mockExternalResult = {
        success: false,
        error: 'External service error',
        source: 'api',
      };

      (Book.findOne as jest.Mock).mockResolvedValue(null);
      (isbnService.lookupBook as jest.Mock).mockResolvedValue(mockExternalResult);

      mockRequest.queryStringParameters = { isbn: '9780140449136' };

      const result = await bookController.searchBooksByIsbn(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as { source: string; book: unknown; error: string }).source).toBe('api');
      expect((result.data as { source: string; book: unknown; error: string }).book).toBe(null);
      expect((result.data as { source: string; book: unknown; error: string }).error).toBe('External service error');
    });
  });

  describe('importBookFromIsbn - missing body', () => {
    it('should return 400 for missing request body', async () => {
      mockRequest.body = undefined;

      const result = await bookController.importBookFromIsbn(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('ISBN is required');
    });

    it('should return 400 for missing ISBN in body', async () => {
      mockRequest.body = JSON.stringify({});

      const result = await bookController.importBookFromIsbn(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('ISBN is required');
    });
  });

  describe('user-specific methods', () => {
    it('should require authentication for getUserBooks', async () => {
      delete mockRequest.user;

      const result = await bookController.getUserBooks(mockRequest);

      expect(result.statusCode).toBe(401);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User authentication required');
    });

    it('should call listBooks with user context', async () => {
      mockRequest.user = { userId: 123 };
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

    // Note: createBookForUser has a bug where it adds userId to body but schema rejects it
    // This would need to be fixed in the controller implementation
  });
});