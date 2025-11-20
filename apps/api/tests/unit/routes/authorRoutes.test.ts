// ================================================================
// tests/routes/authorRoutes.test.ts
// ================================================================

import request from 'supertest';
import express from 'express';
import authorRoutes from '../../../src/routes/authorRoutes';
import { authMiddleware } from '../../../src/middleware/auth';

// Mock dependencies
jest.mock('../../../src/controllers/AuthorController', () => ({
  authorController: {
    listAuthors: jest.fn(),
    getAuthor: jest.fn(),
    createAuthor: jest.fn(),
    updateAuthor: jest.fn(),
    deleteAuthor: jest.fn(),
    getAuthorBooks: jest.fn(),
    searchAuthors: jest.fn(),
  }
}));
jest.mock('../../../src/middleware/auth');

const app = express();
app.use(express.json());
app.use('/api/authors', authorRoutes);

describe('Author Routes', () => {
  let mockAuthorController: {
    listAuthors: jest.Mock;
    getAuthor: jest.Mock;
    createAuthor: jest.Mock;
    updateAuthor: jest.Mock;
    deleteAuthor: jest.Mock;
    getAuthorBooks: jest.Mock;
    searchAuthors: jest.Mock;
  };
  let mockAuthMiddleware: jest.MockedFunction<typeof authMiddleware>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mocked controller
    const { authorController } = require('../../../src/controllers/AuthorController');
    mockAuthorController = authorController;
    
    // Mock auth middleware to pass through
    mockAuthMiddleware = authMiddleware as jest.MockedFunction<typeof authMiddleware>;
    mockAuthMiddleware.mockImplementation(async (req, _res, next) => {
      (req as any).user = { userId: 123 };
      next();
    });
  });

  describe('GET /', () => {
    it('should call listAuthors controller method', async () => {
      mockAuthorController.listAuthors.mockResolvedValue({
        statusCode: 200,
        success: true,
        data: [
          { id: 1, name: 'John', surname: 'Doe' },
          { id: 2, name: 'Jane', surname: 'Smith' },
        ],
      });

      const response = await request(app)
        .get('/api/authors')
        .expect(200);

      expect(mockAuthorController.listAuthors).toHaveBeenCalledWith({
        body: undefined,
        queryStringParameters: {},
        pathParameters: {},
        user: { userId: 123 },
      });
      
      expect(response.body).toEqual({
        success: true,
        data: [
          { id: 1, name: 'John', surname: 'Doe' },
          { id: 2, name: 'Jane', surname: 'Smith' },
        ],
      });
    });

    it('should pass pagination parameters', async () => {
      mockAuthorController.listAuthors.mockResolvedValue({
        statusCode: 200,
        success: true,
        data: [],
        meta: { page: 1, limit: 5, total: 0, totalPages: 0 },
      });

      await request(app)
        .get('/api/authors?page=1&limit=5')
        .expect(200);

      expect(mockAuthorController.listAuthors).toHaveBeenCalledWith({
        body: undefined,
        queryStringParameters: { page: '1', limit: '5' },
        pathParameters: {},
        user: { userId: 123 },
      });
    });
  });

  describe('GET /:id', () => {
    it('should call getAuthor controller method', async () => {
      mockAuthorController.getAuthor.mockResolvedValue({
        statusCode: 200,
        success: true,
        data: { id: 1, name: 'John', surname: 'Doe' },
      });

      const response = await request(app)
        .get('/api/authors/1')
        .expect(200);

      expect(mockAuthorController.getAuthor).toHaveBeenCalledWith({
        body: undefined,
        queryStringParameters: {},
        pathParameters: { id: '1' },
        user: { userId: 123 },
      });
      
      expect(response.body).toEqual({
        success: true,
        data: { id: 1, name: 'John', surname: 'Doe' },
      });
    });

    it('should handle not found error', async () => {
      mockAuthorController.getAuthor.mockResolvedValue({
        statusCode: 404,
        success: false,
        error: 'Author not found',
      });

      const response = await request(app)
        .get('/api/authors/999')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Author not found',
      });
    });
  });

  describe('POST /', () => {
    it('should call createAuthor controller method', async () => {
      const authorData = {
        name: 'New',
        surname: 'Author',
        nationality: 'US',
      };

      mockAuthorController.createAuthor.mockResolvedValue({
        statusCode: 201,
        success: true,
        data: { id: 1, ...authorData },
        message: 'Author created successfully',
      });

      const response = await request(app)
        .post('/api/authors')
        .send(authorData)
        .expect(201);

      expect(mockAuthorController.createAuthor).toHaveBeenCalledWith({
        body: JSON.stringify(authorData),
        queryStringParameters: {},
        pathParameters: {},
        user: { userId: 123 },
      });
      
      expect(response.body).toEqual({
        success: true,
        data: { id: 1, ...authorData },
        message: 'Author created successfully',
      });
    });

    it('should handle validation errors', async () => {
      mockAuthorController.createAuthor.mockResolvedValue({
        statusCode: 400,
        success: false,
        error: 'Name and surname are required',
      });

      const response = await request(app)
        .post('/api/authors')
        .send({ name: '' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Name and surname are required',
      });
    });
  });

  describe('PUT /:id', () => {
    it('should call updateAuthor controller method', async () => {
      const updateData = { name: 'Updated', surname: 'Author' };

      mockAuthorController.updateAuthor.mockResolvedValue({
        statusCode: 200,
        success: true,
        data: { id: 1, ...updateData },
        message: 'Author updated successfully',
      });

      const response = await request(app)
        .put('/api/authors/1')
        .send(updateData)
        .expect(200);

      expect(mockAuthorController.updateAuthor).toHaveBeenCalledWith({
        body: JSON.stringify(updateData),
        queryStringParameters: {},
        pathParameters: { id: '1' },
        user: { userId: 123 },
      });
      
      expect(response.body).toEqual({
        success: true,
        data: { id: 1, ...updateData },
        message: 'Author updated successfully',
      });
    });

    it('should handle not found during update', async () => {
      mockAuthorController.updateAuthor.mockResolvedValue({
        statusCode: 404,
        success: false,
        error: 'Author not found',
      });

      const response = await request(app)
        .put('/api/authors/999')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Author not found',
      });
    });
  });

  describe('DELETE /:id', () => {
    it('should call deleteAuthor controller method', async () => {
      mockAuthorController.deleteAuthor.mockResolvedValue({
        statusCode: 204,
        success: true,
        message: 'Author deleted successfully',
      });

      await request(app)
        .delete('/api/authors/1')
        .expect(204);

      expect(mockAuthorController.deleteAuthor).toHaveBeenCalledWith({
        body: undefined,
        queryStringParameters: {},
        pathParameters: { id: '1' },
        user: { userId: 123 },
      });
    });

    it('should handle not found during deletion', async () => {
      mockAuthorController.deleteAuthor.mockResolvedValue({
        statusCode: 404,
        success: false,
        error: 'Author not found',
      });

      const response = await request(app)
        .delete('/api/authors/999')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Author not found',
      });
    });
  });

  describe('GET /:id/books', () => {
    it('should call getAuthorBooks controller method', async () => {
      mockAuthorController.getAuthorBooks.mockResolvedValue({
        statusCode: 200,
        success: true,
        data: [
          { id: 1, title: 'Book 1', isbnCode: '123' },
          { id: 2, title: 'Book 2', isbnCode: '456' },
        ],
      });

      const response = await request(app)
        .get('/api/authors/1/books')
        .expect(200);

      expect(mockAuthorController.getAuthorBooks).toHaveBeenCalledWith({
        body: undefined,
        queryStringParameters: {},
        pathParameters: { id: '1' },
        user: { userId: 123 },
      });
      
      expect(response.body).toEqual({
        success: true,
        data: [
          { id: 1, title: 'Book 1', isbnCode: '123' },
          { id: 2, title: 'Book 2', isbnCode: '456' },
        ],
      });
    });

    it('should handle author not found for books', async () => {
      mockAuthorController.getAuthorBooks.mockResolvedValue({
        statusCode: 404,
        success: false,
        error: 'Author not found',
      });

      const response = await request(app)
        .get('/api/authors/999/books')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Author not found',
      });
    });

    it('should handle author with no books', async () => {
      mockAuthorController.getAuthorBooks.mockResolvedValue({
        statusCode: 200,
        success: true,
        data: [],
      });

      const response = await request(app)
        .get('/api/authors/1/books')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
      });
    });
  });

  describe('Authentication middleware', () => {
    it('should require authentication for all routes', async () => {
      // Reset the auth middleware mock to reject requests
      mockAuthMiddleware.mockImplementation(async (_req, res, _next) => {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      });

      await request(app).get('/api/authors').expect(401);
      await request(app).get('/api/authors/1').expect(401);
      await request(app).post('/api/authors').expect(401);
      await request(app).put('/api/authors/1').expect(401);
      await request(app).delete('/api/authors/1').expect(401);
      await request(app).get('/api/authors/1/books').expect(401);
    });
  });

  describe('Error handling', () => {
    it('should handle controller method throwing an error', async () => {
      mockAuthorController.listAuthors.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/authors')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        details: 'Database connection failed',
      });
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/authors')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Express handles malformed JSON
      expect(response.status).toBe(400);
    });
  });
});