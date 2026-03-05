// ================================================================
// tests/controllers/admin/AdminBookController.test.ts
// ================================================================

import { AdminBookController } from '../../../../src/controllers/admin/AdminBookController';
import { User } from '../../../../src/models/User';
import { UniversalRequest } from '../../../../src/types';
import { Repository as BookRepositoryContract } from '../../../../src/repositories/book/Repository';

jest.mock('../../../../src/models/User');

const createMockBookRepository = (overrides: Partial<BookRepositoryContract> = {}): jest.Mocked<BookRepositoryContract> => ({
  search: jest.fn(),
  findById: jest.fn(),
  findByIsbnCode: jest.fn(),
  findUserBookById: jest.fn(),
  listUserBooks: jest.fn(),
  countUserBooks: jest.fn(),
  findRecentUserBooks: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  ...overrides,
} as jest.Mocked<BookRepositoryContract>);

const mockBookEntity = (overrides = {}) => ({
  id: 1,
  title: 'Book 1',
  isbnCode: '1234567890',
  userId: 1,
  authors: [{ id: 1, name: 'John', surname: 'Doe' }],
  categories: [{ id: 1, name: 'Fiction' }],
  creationDate: new Date(),
  updateDate: new Date(),
  ...overrides,
});

describe('AdminBookController', () => {
  let adminBookController: AdminBookController;
  let mockRepository: jest.Mocked<BookRepositoryContract>;
  let mockRequest: UniversalRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = createMockBookRepository();
    adminBookController = new AdminBookController(mockRepository);

    (adminBookController as any).initializeI18n = jest.fn().mockResolvedValue(undefined);
    (adminBookController as any).t = jest.fn((key: string) => {
      const map: Record<string, string> = {
        'success:book_deleted': 'Book deleted successfully',
        'errors:book_id_required': 'Book ID is required',
        'errors:invalid_request_body': 'Invalid request body',
        'errors:internal_server_error': 'Internal server error',
        'errors:user_not_found': 'User not found',
        'errors:book_not_found': 'Book not found',
      };
      return map[key] ?? key;
    });

    mockRequest = {
      queryStringParameters: {},
      params: {},
      headers: { 'accept-language': 'en' },
      body: undefined,
    };
  });

  describe('getAllBooks', () => {
    it('should return a paginated list of books with user name', async () => {
      const mockUser = { id: 1, name: 'Test', surname: 'User', getFullName: () => 'Test User' };
      mockRepository.search.mockResolvedValue({ rows: [mockBookEntity()], total: 1, limit: 10, offset: 0 });
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      mockRequest.queryStringParameters = { page: '1', limit: '10' };

      const result = await adminBookController.getAllBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as { books: any[] }).books).toHaveLength(1);
      expect((result.data as { books: any[] }).books[0].userName).toBe('Test User');
      expect(result.pagination).toEqual({ currentPage: 1, itemsPerPage: 10, totalItems: 1, totalPages: 1 });
      expect(mockRepository.search).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ limit: 10, offset: 0, orderBy: 'creationDate', orderDirection: 'desc' })
      );
    });

    it('should pass searchQuery filter when search param is provided', async () => {
      mockRepository.search.mockResolvedValue({ rows: [mockBookEntity({ title: 'Search Book' })], total: 1, limit: 20, offset: 0 });
      (User.findByPk as jest.Mock).mockResolvedValue(null);
      mockRequest.queryStringParameters = { search: 'search' };

      const result = await adminBookController.getAllBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(mockRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({ searchQuery: 'search' }),
        expect.any(Object)
      );
    });

    it('should pass userId filter when userId param is provided', async () => {
      mockRepository.search.mockResolvedValue({ rows: [mockBookEntity({ userId: 5 })], total: 1, limit: 20, offset: 0 });
      (User.findByPk as jest.Mock).mockResolvedValue(null);
      mockRequest.queryStringParameters = { userId: '5' };

      const result = await adminBookController.getAllBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(mockRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 5 }),
        expect.any(Object)
      );
    });

    it('should return 500 on repository error', async () => {
      mockRepository.search.mockRejectedValue(new Error('Database error'));

      const result = await adminBookController.getAllBooks(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
    });
  });

  describe('getBookById', () => {
    it('should return a book by ID with user name', async () => {
      const mockUser = { id: 1, name: 'Test', surname: 'User', getFullName: () => 'Test User' };
      mockRepository.findById.mockResolvedValue(mockBookEntity());
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      mockRequest.params = { id: '1' };

      const result = await adminBookController.getBookById(mockRequest);

      expect(result.statusCode).toBe(200);
      expect((result.data as any).id).toBe(1);
      expect((result.data as any).userName).toBe('Test User');
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return 400 if book ID is missing', async () => {
      mockRequest.params = {};

      const result = await adminBookController.getBookById(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
    });

    it('should return 404 if book is not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      mockRequest.params = { id: '999' };

      const result = await adminBookController.getBookById(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Book not found');
    });

    it('should return 500 on repository error', async () => {
      mockRepository.findById.mockRejectedValue(new Error('Database error'));
      mockRequest.params = { id: '1' };

      const result = await adminBookController.getBookById(mockRequest);

      expect(result.statusCode).toBe(500);
    });
  });

  describe('updateBook', () => {
    it('should update a book successfully', async () => {
      const mockUser = { id: 1, name: 'Test', surname: 'User', getFullName: () => 'Test User' };
      const updatedBook = mockBookEntity({ title: 'New Title' });
      mockRepository.findById.mockResolvedValue(mockBookEntity());
      mockRepository.update.mockResolvedValue(updatedBook);
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      mockRequest.params = { id: '1' };
      mockRequest.body = JSON.stringify({ title: 'New Title', userId: 1 });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as any).title).toBe('New Title');
      expect((result.data as any).userName).toBe('Test User');
      expect(mockRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'New Title' }));
    });

    it('should return 400 if book ID is missing', async () => {
      mockRequest.params = {};
      mockRequest.body = JSON.stringify({ title: 'New Title' });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if request body is invalid', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = null;

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(400);
    });

    it('should return 404 if book to update is not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      mockRequest.params = { id: '999' };
      mockRequest.body = JSON.stringify({ title: 'New Title' });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Book not found');
    });

    it('should return 404 if new userId does not exist', async () => {
      mockRepository.findById.mockResolvedValue(mockBookEntity());
      (User.findByPk as jest.Mock).mockResolvedValue(null);
      mockRequest.params = { id: '1' };
      mockRequest.body = JSON.stringify({ userId: 999 });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('User not found');
    });

    it('should return 500 on repository error', async () => {
      mockRepository.findById.mockResolvedValue(mockBookEntity());
      mockRepository.update.mockRejectedValue(new Error('Database error'));
      (User.findByPk as jest.Mock).mockResolvedValue({ getFullName: () => 'Test User' });
      mockRequest.params = { id: '1' };
      mockRequest.body = JSON.stringify({ title: 'New Title' });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(500);
    });
  });

  describe('deleteBook', () => {
    it('should delete a book successfully', async () => {
      mockRepository.delete.mockResolvedValue(true);
      mockRequest.params = { id: '1' };

      const result = await adminBookController.deleteBook(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should return 400 if book ID is missing', async () => {
      mockRequest.params = {};

      const result = await adminBookController.deleteBook(mockRequest);

      expect(result.statusCode).toBe(400);
    });

    it('should return 404 if book to delete is not found', async () => {
      mockRepository.delete.mockResolvedValue(false);
      mockRequest.params = { id: '999' };

      const result = await adminBookController.deleteBook(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Book not found');
    });

    it('should return 500 on repository error', async () => {
      mockRepository.delete.mockRejectedValue(new Error('Database error'));
      mockRequest.params = { id: '1' };

      const result = await adminBookController.deleteBook(mockRequest);

      expect(result.statusCode).toBe(500);
    });
  });
});
