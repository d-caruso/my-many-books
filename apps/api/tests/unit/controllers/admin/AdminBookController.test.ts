// ================================================================
// tests/controllers/admin/AdminBookController.test.ts
// ================================================================

import { AdminBookController } from '../../../../src/controllers/admin/AdminBookController';
import {
  AdminBookMutationService,
  AdminBookMutationServiceError,
} from '../../../../src/services/book/AdminBookMutationService';
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
  let mockMutationService: jest.Mocked<AdminBookMutationService>;
  let mockRequest: UniversalRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = createMockBookRepository();
    mockMutationService = {
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
    } as unknown as jest.Mocked<AdminBookMutationService>;
    adminBookController = new AdminBookController(mockRepository, mockMutationService);

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
      user: { id: 99, email: 'admin@example.com', role: 'admin', provider: 'cognito' },
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
      mockMutationService.updateBook.mockResolvedValue(updatedBook as any);
      (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
      mockRequest.params = { id: '1' };
      mockRequest.body = JSON.stringify({ title: 'New Title', userId: 1 });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as any).title).toBe('New Title');
      expect((result.data as any).userName).toBe('Test User');
      expect(mockMutationService.updateBook).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: 'New Title' }),
        { userId: 99, role: 'admin' }
      );
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
      mockMutationService.updateBook.mockRejectedValue(new AdminBookMutationServiceError('BOOK_NOT_FOUND'));
      mockRequest.params = { id: '999' };
      mockRequest.body = JSON.stringify({ title: 'New Title' });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Book not found');
    });

    it('should return 404 if new userId does not exist', async () => {
      mockMutationService.updateBook.mockRejectedValue(new AdminBookMutationServiceError('USER_NOT_FOUND'));
      mockRequest.params = { id: '1' };
      mockRequest.body = JSON.stringify({ userId: 999 });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('User not found');
    });

    it('should return 500 on repository error', async () => {
      mockMutationService.updateBook.mockRejectedValue(new Error('Database error'));
      mockRequest.params = { id: '1' };
      mockRequest.body = JSON.stringify({ title: 'New Title' });

      const result = await adminBookController.updateBook(mockRequest);

      expect(result.statusCode).toBe(500);
    });
  });

  describe('deleteBook', () => {
    it('should delete a book successfully', async () => {
      mockRequest.params = { id: '1' };

      const result = await adminBookController.deleteBook(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(mockMutationService.deleteBook).toHaveBeenCalledWith(1, { userId: 99, role: 'admin' });
    });

    it('should return 400 if book ID is missing', async () => {
      mockRequest.params = {};

      const result = await adminBookController.deleteBook(mockRequest);

      expect(result.statusCode).toBe(400);
    });

    it('should return 404 if book to delete is not found', async () => {
      mockMutationService.deleteBook.mockRejectedValue(new AdminBookMutationServiceError('BOOK_NOT_FOUND'));
      mockRequest.params = { id: '999' };

      const result = await adminBookController.deleteBook(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.error).toBe('Book not found');
    });

    it('should return 500 on repository error', async () => {
      mockMutationService.deleteBook.mockRejectedValue(new Error('Database error'));
      mockRequest.params = { id: '1' };

      const result = await adminBookController.deleteBook(mockRequest);

      expect(result.statusCode).toBe(500);
    });
  });
});
