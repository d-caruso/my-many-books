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

  });

  afterAll(async () => {
    await ModelManager.close();
  });

  beforeEach(async () => {
    container.snapshot();
    bookController = container.get<BookController>(TYPES.BookController);
    authorController = container.get<AuthorController>(TYPES.AuthorController);
    await Book.destroy({ where: {}, truncate: true });
    await Author.destroy({ where: {}, truncate: true });
    await Category.destroy({ where: {}, truncate: true });
  });

  afterEach(() => {
    container.restore();
  });

  describe('Books API - Language Detection', () => {
    const mockUser = { id: 1, email: 'test@example.com', role: 'user', provider: 'cognito' };

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

  });

  describe('Authors API - Language Detection', () => {
    const mockUser = { id: 1, email: 'test@example.com', role: 'user', provider: 'cognito' };

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
    const mockUser = { id: 1, email: 'test@example.com', role: 'user', provider: 'cognito' };

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
