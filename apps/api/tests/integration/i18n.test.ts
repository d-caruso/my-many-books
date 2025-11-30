// ================================================================
// tests/integration/i18n.test.ts
// Integration tests for i18n functionality
// Tests API responses in both EN and IT languages
// ================================================================

import { Sequelize } from 'sequelize';
import { ModelManager } from '../../src/models';
import { Book } from '../../src/models/Book';
import { Author } from '../../src/models/Author';
import { Category } from '../../src/models/Category';
import { BookController } from '../../src/controllers/BookController';
import { AuthorController } from '../../src/controllers/AuthorController';
import { UniversalRequest } from '../../src/types';
import { container } from '../../src/container';
import { TYPES } from '../../src/container/types';

describe('i18n Integration Tests', () => {
  let sequelize: Sequelize;
  let bookController: BookController;
  let authorController: AuthorController;

  beforeAll(async () => {
    sequelize = new Sequelize('sqlite::memory:', {
      logging: false,
    });

    ModelManager.initialize(sequelize);
    await ModelManager.syncDatabase(true);

    authorController = new AuthorController();
  });

  afterAll(async () => {
    await ModelManager.close();
  });

  beforeEach(async () => {
    container.snapshot();
    bookController = container.get<BookController>(TYPES.BookController);
    await Book.destroy({ where: {}, truncate: true });
    await Author.destroy({ where: {}, truncate: true });
    await Category.destroy({ where: {}, truncate: true });
  });

  afterEach(() => {
    container.restore();
  });

  describe('Books API - Language Detection', () => {
    const mockUser = { userId: 1, email: 'test@example.com', role: 'user' };

    it('should return error in English when Accept-Language is en', async () => {
      const request: UniversalRequest = {
        pathParameters: { id: '99999' },
        headers: { 'accept-language': 'en' },
        user: mockUser,
      };

      const response = await bookController.getBookById(request);

      expect(response.statusCode).toBe(404);
      expect(response.error).toContain('not found');
      expect(response.error).not.toContain('trovato'); // Italian word
    });

    it('should return error in Italian when Accept-Language is it', async () => {
      const request: UniversalRequest = {
        pathParameters: { id: '99999' },
        headers: { 'accept-language': 'it' },
        user: mockUser,
      };

      const response = await bookController.getBookById(request);

      expect(response.statusCode).toBe(404);
      expect(response.error).toContain('trovato'); // Italian translation for "found"
    });

    it('should handle missing request body error in English', async () => {
      const request: UniversalRequest = {
        body: undefined,
        headers: { 'accept-language': 'en' },
      };

      const response = await bookController.createBook(request);

      expect(response.statusCode).toBe(400);
      expect(response.error).toBeDefined();
      expect(typeof response.error).toBe('string');
    });

    it('should handle missing request body error in Italian', async () => {
      const request: UniversalRequest = {
        body: undefined,
        headers: { 'accept-language': 'it' },
      };

      const response = await bookController.createBook(request);

      expect(response.statusCode).toBe(400);
      expect(response.error).toBeDefined();
      expect(typeof response.error).toBe('string');
    });
  });

  describe('Authors API - Language Detection', () => {
    const mockUser = { userId: 1, email: 'test@example.com', role: 'user' };

    it('should return error in English for non-existent author', async () => {
      const request: UniversalRequest = {
        pathParameters: { id: '99999' },
        headers: { 'accept-language': 'en' },
        user: mockUser,
      };

      const response = await authorController.getAuthor(request);

      expect(response.statusCode).toBe(404);
      expect(response.error).toBeDefined();
    });

    it('should return error in Italian for non-existent author', async () => {
      const request: UniversalRequest = {
        pathParameters: { id: '99999' },
        headers: { 'accept-language': 'it' },
        user: mockUser,
      };

      const response = await authorController.getAuthor(request);

      expect(response.statusCode).toBe(404);
      expect(response.error).toBeDefined();
    });
  });

  describe('Default Language Handling', () => {
    const mockUser = { userId: 1, email: 'test@example.com', role: 'user' };

    it('should default to English when no Accept-Language header is provided', async () => {
      const request: UniversalRequest = {
        pathParameters: { id: '99999' },
        headers: {},
        user: mockUser,
      };

      const response = await bookController.getBookById(request);

      expect(response.statusCode).toBe(404);
      expect(response.error).toContain('not found');
    });

    it('should handle unsupported language by falling back to English', async () => {
      const request: UniversalRequest = {
        pathParameters: { id: '99999' },
        headers: { 'accept-language': 'fr' }, // French - not supported
        user: mockUser,
      };

      const response = await bookController.getBookById(request);

      expect(response.statusCode).toBe(404);
      expect(response.error).toBeDefined();
      // Should fallback to English
      expect(response.error).toContain('not found');
    });
  });
});
