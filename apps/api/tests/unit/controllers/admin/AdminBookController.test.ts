// ================================================================
// tests/controllers/admin/AdminBookController.test.ts
// ================================================================

import { AdminBookController } from '../../../../src/controllers/admin/AdminBookController';
import { Book } from '../../../../src/models/Book';
import { Author } from '../../../../src/models/Author';
import { Category } from '../../../../src/models/Category';
import { User } from '../../../../src/models/User';
import { UniversalRequest } from '../../../../src/types';
import { Op } from 'sequelize';

// Mock dependencies
jest.mock('../../../../src/models/Book');
jest.mock('../../../../src/models/Author');
jest.mock('../../../../src/models/Category');
jest.mock('../../../../src/models/User');

describe('AdminBookController', () => {
  let adminBookController: AdminBookController;
  let mockRequest: UniversalRequest;

  beforeEach(() => {
    adminBookController = new AdminBookController();
    jest.clearAllMocks();

    // Mock BaseController's i18n methods
    (adminBookController as any).initializeI18n = jest.fn().mockResolvedValue(undefined);
    (adminBookController as any).t = jest.fn((key: string) => {
      if (key === 'success:book_deleted') return 'Book deleted successfully';
      if (key === 'errors:book_id_required') return 'Book ID is required';
      if (key === 'errors:invalid_request_body') return 'Invalid request body';
      if (key === 'errors:internal_server_error') return 'Internal server error';
      if (key === 'errors:user_not_found') return 'User not found';
      if (key === 'errors:book_not_found') return 'Book not found';
      if (key === 'errors:validation_failed') return 'Validation failed';
      return key; // Fallback for other keys
    });

    mockRequest = {
      queryStringParameters: {},
      pathParameters: {},
      headers: { 'accept-language': 'en' },
      body: undefined,
    };
  });

  describe('getAllBooks', () => {
    it('should return a paginated list of books with associated data', async () => {
      const mockAuthors = [{ id: 1, name: 'John', surname: 'Doe' }];
      const mockCategories = [{ id: 1, name: 'Fiction' }];
      const mockUser = { id: 1, name: 'Test', surname: 'User', getFullName: () => 'Test User' };

      const mockBooks = [
        {
          id: 1,
          title: 'Book 1',
          isbnCode: '1234567890',
          userId: 1,
          authors: mockAuthors,
          categories: mockCategories,
          creationDate: new Date(),
          updateDate: new Date(),
        },
      ];

      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 1,
        rows: mockBooks,
      });
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      mockRequest.queryStringParameters = { page: '1', limit: '10' };

      const result = await adminBookController.getAllBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as { books: any[] }).books).toHaveLength(1);
      expect((result.data as { books: any[] }).books[0].userName).toBe('Test User');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(Book.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
          order: [['creationDate', 'DESC']],
          include: expect.arrayContaining([
            expect.objectContaining({ model: Author, as: 'authors' }),
            expect.objectContaining({ model: Category, as: 'categories' }),
          ]),
        })
      );
    });

    it('should return a filtered list of books based on search query', async () => {
      const mockBooks = [
        {
          id: 1,
          title: 'Search Book',
          isbnCode: '1112223334',
          userId: 1,
          authors: [],
          categories: [],
          creationDate: new Date(),
          updateDate: new Date(),
        },
      ];

      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 1,
        rows: mockBooks,
      });
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      mockRequest.queryStringParameters = { search: 'search' };

      const result = await adminBookController.getAllBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as { books: any[] }).books).toHaveLength(1);
      expect(Book.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            [Op.or]: [
              { title: { [Op.like]: '%search%' } },
              { isbnCode: { [Op.like]: '%search%' } },
            ],
          },
        })
      );
    });

    it('should return a filtered list of books based on userId', async () => {
      const mockBooks = [
        {
          id: 1,
          title: 'User Book',
          isbnCode: '1112223334',
          userId: 5,
          authors: [],
          categories: [],
          creationDate: new Date(),
          updateDate: new Date(),
        },
      ];

      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 1,
        rows: mockBooks,
      });
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      mockRequest.queryStringParameters = { userId: '5' };

      const result = await adminBookController.getAllBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as any).books).toHaveLength(1);
      expect(Book.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 5,
          },
        })
      );
    });

    it('should handle errors during book retrieval', async () => {
      (Book.findAndCountAll as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await adminBookController.getAllBooks(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('getBookById', () => {
    it('should return a book by ID with associated data', async () => {
      const mockAuthors = [{ id: 1, name: 'John', surname: 'Doe' }];
      const mockCategories = [{ id: 1, name: 'Fiction' }];
      const mockUser = { id: 1, name: 'Test', surname: 'User', getFullName: () => 'Test User' };

      const mockBook = {
        id: 1,
        title: 'Book 1',
        isbnCode: '1234567890',
        userId: 1,
        authors: mockAuthors,
        categories: mockCategories,
        creationDate: new Date(),
        updateDate: new Date(),
      };
      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      mockRequest.pathParameters = { id: '1' };

      const result = await adminBookController.getBookById(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as any).id).toBe(1);
      expect((result.data as any).userName).toBe('Test User');
      expect(Book.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('should return 400 if book ID is missing', async () => {
      mockRequest.pathParameters = {};

      const result = await adminBookController.getBookById(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe((adminBookController as any).t('errors:book_id_required'));
    });

    it('should return 404 if book is not found', async () => {
      (Book.findByPk as jest.Mock).mockResolvedValue(null);

      mockRequest.pathParameters = { id: '999' };

      const result = await adminBookController.getBookById(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Book not found');
    });

    it('should handle errors during book retrieval by ID', async () => {
      (Book.findByPk as jest.Mock).mockRejectedValue(new Error('Database error'));

      mockRequest.pathParameters = { id: '1' };

      const result = await adminBookController.getBookById(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('updateBook', () => {
    it('should update a book successfully', async () => {
      const mockBook = {
        id: 1,
        title: 'Old Title',
        isbnCode: '1234567890',
        userId: 1,
        authors: [],
        categories: [],
        creationDate: new Date(),
        updateDate: new Date(),
        update: jest.fn(function (this: any, values: any) {
          Object.assign(this, values);
          return Promise.resolve(this);
        }),
        reload: jest.fn(function (this: any) {
          // Simulate reload by returning the current state of the mock book
          return Promise.resolve(this);
        }),
      };
      const mockUser = { id: 1, name: 'Test', surname: 'User', getFullName: () => 'Test User' };

      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify({ title: 'New Title', userId: 1 });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(mockBook.update).toHaveBeenCalledWith({ title: 'New Title', userId: 1 });
      expect(mockBook.reload).toHaveBeenCalled();
      expect((result.data as any).title).toBe('New Title');
      expect((result.data as any).userName).toBe('Test User');
    });

    it('should return 400 if book ID is missing', async () => {
      mockRequest.pathParameters = {};
      mockRequest.body = JSON.stringify({ title: 'New Title' });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe((adminBookController as any).t('errors:book_id_required'));
    });

    it('should return 400 if request body is missing', async () => {
      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = null;

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe((adminBookController as any).t('errors:invalid_request_body'));
    });

    it('should return 400 for validation errors', async () => {
      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify({ title: '' });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    it('should return 404 if book to update is not found', async () => {
      (Book.findByPk as jest.Mock).mockResolvedValue(null);

      mockRequest.pathParameters = { id: '999' };
      mockRequest.body = JSON.stringify({ title: 'New Title' });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Book not found');
    });

    it('should return 404 if new userId does not exist', async () => {
      const mockBook = {
        id: 1,
        title: 'Old Title',
        isbnCode: '1234567890',
        userId: 1,
        authors: [],
        categories: [],
        creationDate: new Date(),
        updateDate: new Date(),
        update: jest.fn().mockResolvedValue(true),
        reload: jest.fn().mockResolvedValue(true),
      };

      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);
      (User.findByPk as jest.Mock).mockResolvedValue(null); // User not found

      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify({ userId: 999 });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle errors during book update', async () => {
      const mockBook = {
        id: 1,
        title: 'Old Title',
        isbnCode: '1234567890',
        userId: 1,
        authors: [],
        categories: [],
        creationDate: new Date(),
        updateDate: new Date(),
        update: jest.fn().mockRejectedValue(new Error('Database error')),
        reload: jest.fn(),
      };
      const mockUser = { id: 1, name: 'Test', surname: 'User', getFullName: () => 'Test User' };

      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify({ title: 'New Title' });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('deleteBook', () => {
    it('should delete a book successfully', async () => {
      const mockBook = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };
      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);

      mockRequest.pathParameters = { id: '1' };

      const result = await adminBookController.deleteBook(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as any).message).toBe((adminBookController as any).t('success:book_deleted'));
      expect(mockBook.destroy).toHaveBeenCalled();
    });

    it('should return 400 if book ID is missing', async () => {
      mockRequest.pathParameters = {};

      const result = await adminBookController.deleteBook(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe((adminBookController as any).t('errors:book_id_required'));
    });

    it('should return 404 if book to delete is not found', async () => {
      (Book.findByPk as jest.Mock).mockResolvedValue(null);

      mockRequest.pathParameters = { id: '999' };

      const result = await adminBookController.deleteBook(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Book not found');
    });

    it('should handle errors during book deletion', async () => {
      const mockBook = {
        id: 1,
        destroy: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);

      mockRequest.pathParameters = { id: '1' };

      const result = await adminBookController.deleteBook(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });
});
