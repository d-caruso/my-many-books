// ================================================================
// tests/controllers/AuthorController.test.ts
// ================================================================

import { AuthorController } from '../../../src/controllers/AuthorController';
import { Author, Book } from '../../../src/models';

// Universal request interface for testing
interface UniversalRequest {
  body?: any;
  queryStringParameters?: { [key: string]: string | undefined };
  pathParameters?: { [key: string]: string | undefined };
  headers?: { [key: string]: string | undefined };
  user?: { userId: number };
}

// Mock dependencies
jest.mock('../../../src/models');

describe('AuthorController', () => {
  let authorController: AuthorController;
  let mockRequest: UniversalRequest;

  beforeEach(() => {
    authorController = new AuthorController();
    jest.clearAllMocks();

    mockRequest = {
      queryStringParameters: {},
      pathParameters: {},
      headers: { 'accept-language': 'en' },
      body: undefined,
    };
  });

  describe('createAuthor', () => {
    const validAuthorData = {
      name: 'John',
      surname: 'Doe',
      nationality: 'American',
    };

    it('should create an author successfully', async () => {
      const mockAuthor = { id: 1, ...validAuthorData };

      (Author.findOne as jest.Mock).mockResolvedValue(null);
      (Author.create as jest.Mock).mockResolvedValue(mockAuthor);

      mockRequest.body = JSON.stringify(validAuthorData);

      const result = await authorController.createAuthor(mockRequest);

      expect(result.statusCode).toBe(201);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Author created successfully');
      expect(result.data).toEqual(mockAuthor);
    });

    it('should create author with name and surname', async () => {
      const authorData = {
        name: 'Jane',
        surname: 'Smith',
        nationality: 'British',
      };

      const expectedAuthor = {
        id: 1,
        ...authorData,
        getFullName: jest.fn().mockReturnValue('Jane Smith'),
      };

      (Author.findOne as jest.Mock).mockResolvedValue(null);
      (Author.create as jest.Mock).mockResolvedValue(expectedAuthor);

      mockRequest.body = JSON.stringify(authorData);

      const result = await authorController.createAuthor(mockRequest);

      expect(result.statusCode).toBe(201);
      expect(result.success).toBe(true);
      expect(Author.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane',
          surname: 'Smith',
        })
      );
    });

    it('should return 400 for missing request body', async () => {
      mockRequest.body = null;

      const result = await authorController.createAuthor(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Request body is required');
    });

    it('should return 400 for validation errors', async () => {
      const invalidData = { name: 'John' }; // Missing required surname

      mockRequest.body = JSON.stringify(invalidData);

      const result = await authorController.createAuthor(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    it('should return 409 for duplicate author name', async () => {
      (Author.findOne as jest.Mock).mockResolvedValue({
        id: 2,
        name: 'John',
        surname: 'Doe',
      });

      mockRequest.body = JSON.stringify(validAuthorData);

      const result = await authorController.createAuthor(mockRequest);

      expect(result.statusCode).toBe(409);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Author with this name already exists');
    });

    it('should validate basic author data', async () => {
      const invalidData = {
        name: 'John',
        surname: 'Doe',
        nationality: 'A'.repeat(300), // Too long
      };

      // Mock that author doesn't exist first (validation should happen before duplicate check)
      (Author.findOne as jest.Mock).mockResolvedValue(null);

      mockRequest.body = JSON.stringify(invalidData);

      const result = await authorController.createAuthor(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });
  });

  describe('getAuthor', () => {
    it('should get an author successfully', async () => {
      const mockAuthor = {
        id: 1,
        name: 'John',
        surname: 'Doe',
        nationality: 'American',
      };

      (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);

      mockRequest.pathParameters = { id: '1' };

      const result = await authorController.getAuthor(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAuthor);
    });

    it('should get author with books when includeBooks=true', async () => {
      const mockAuthor = {
        id: 1,
        name: 'John',
        surname: 'Doe',
        Books: [{ id: 1, title: 'Test Book' }],
      };

      (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);

      mockRequest.pathParameters = { id: '1' };
      mockRequest.queryStringParameters = { includeBooks: 'true' };

      const result = await authorController.getAuthor(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as { Books: unknown }).Books).toBeDefined();
    });

    it('should return 400 for invalid author ID', async () => {
      mockRequest.pathParameters = { id: 'invalid' };

      const result = await authorController.getAuthor(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Valid author ID is required');
    });

    it('should return 404 for non-existent author', async () => {
      (Author.findByPk as jest.Mock).mockResolvedValue(null);

      mockRequest.pathParameters = { id: '999' };

      const result = await authorController.getAuthor(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Author not found');
    });
  });

  describe('updateAuthor', () => {
    const updateData = {
      nationality: 'British',
    };

    it('should update an author successfully', async () => {
      const mockAuthor = {
        id: 1,
        name: 'John',
        surname: 'Doe',
        nationality: 'American',
        update: jest.fn(),
      };

      (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);

      // 'PUT';
      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify(updateData);

      const result = await authorController.updateAuthor(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Author updated successfully');
      expect(mockAuthor.update).toHaveBeenCalled();
    });

    it('should update name when name or surname changes', async () => {
      const mockAuthor = {
        id: 1,
        name: 'John',
        surname: 'Doe',
        nationality: 'American',
        update: jest.fn(),
      };

      const nameUpdateData = {
        name: 'Jane',
        surname: 'Smith',
      };

      (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);
      (Author.findOne as jest.Mock).mockResolvedValue(null); // No conflict

      // 'PUT';
      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify(nameUpdateData);

      const result = await authorController.updateAuthor(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(mockAuthor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane',
          surname: 'Smith',
        })
      );
    });

    it('should return 404 for non-existent author', async () => {
      (Author.findByPk as jest.Mock).mockResolvedValue(null);

      // 'PUT';
      mockRequest.pathParameters = { id: '999' };
      mockRequest.body = JSON.stringify(updateData);

      const result = await authorController.updateAuthor(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Author not found');
    });
  });

  describe('deleteAuthor', () => {
    it('should delete an author successfully', async () => {
      const mockAuthor = {
        id: 1,
        destroy: jest.fn(),
      };

      (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);
      (Book.count as jest.Mock).mockResolvedValue(0); // No books associated

      // 'DELETE';
      mockRequest.pathParameters = { id: '1' };

      const result = await authorController.deleteAuthor(mockRequest);

      expect(result.statusCode).toBe(204);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Author deleted successfully');
      expect(mockAuthor.destroy).toHaveBeenCalled();
    });

    it('should return 409 when author has associated books', async () => {
      const mockAuthor = {
        id: 1,
        destroy: jest.fn(),
      };

      (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);
      (Book.count as jest.Mock).mockResolvedValue(1); // Author has books

      // 'DELETE';
      mockRequest.pathParameters = { id: '1' };

      const result = await authorController.deleteAuthor(mockRequest);

      expect(result.statusCode).toBe(409);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot delete author with associated books');
      expect(mockAuthor.destroy).not.toHaveBeenCalled();
    });
  });

  describe('listAuthors', () => {
    it('should list authors with pagination', async () => {
      const mockAuthors = [
        { id: 1, name: 'John', surname: 'Doe' },
        { id: 2, name: 'Jane', surname: 'Smith' },
      ];

      (Author.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 2,
        rows: mockAuthors,
      });

      mockRequest.queryStringParameters = { page: '1', limit: '10' };

      const result = await authorController.listAuthors(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAuthors);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });
  });

  describe('getAuthorBooks', () => {
    it('should get author books with pagination', async () => {
      const mockAuthor = { 
        id: 1, 
        name: 'John', 
        surname: 'Doe',
        getFullName: jest.fn().mockReturnValue('John Doe')
      };
      const mockBooks = [
        { id: 1, title: 'Book 1' },
        { id: 2, title: 'Book 2' },
      ];

      (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);
      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 2,
        rows: mockBooks,
      });

      mockRequest.pathParameters = { id: '1' };

      const result = await authorController.getAuthorBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect((result.data as { author: unknown; books: unknown }).author).toEqual({
        id: 1,
        name: 'John',
        surname: 'Doe',
      });
      expect((result.data as { author: unknown; books: unknown }).books).toEqual(mockBooks);
    });
  });
});