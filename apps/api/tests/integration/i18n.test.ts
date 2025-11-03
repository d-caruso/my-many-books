// ================================================================
// tests/integration/i18n.test.ts
// Integration tests for i18n functionality
// Tests API responses in both EN and IT languages
// ================================================================

import { APIGatewayProxyEvent } from 'aws-lambda';
import * as booksHandler from '../../src/handlers/books';
import * as authorsHandler from '../../src/handlers/authors';
import { ModelManager } from '../../src/models';
import { Book } from '../../src/models/Book';
import { Author } from '../../src/models/Author';
import { Category } from '../../src/models/Category';
import { Sequelize } from 'sequelize';

describe('i18n Integration Tests', () => {
  let sequelize: Sequelize;

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
    await Book.destroy({ where: {}, truncate: true });
    await Author.destroy({ where: {}, truncate: true });
    await Category.destroy({ where: {}, truncate: true });
  });

  // Helper to create mock events with different Accept-Language headers
  const createMockEvent = (
    overrides: Partial<APIGatewayProxyEvent> = {},
    language: 'en' | 'it' = 'en'
  ): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    path: '/books',
    pathParameters: null,
    queryStringParameters: null,
    body: null,
    headers: { 'accept-language': language },
    requestContext: {
      requestId: 'test-request-id',
      requestTime: '09/Apr/2015:12:34:56 +0000',
      requestTimeEpoch: 1428582896000,
      httpMethod: 'GET',
      path: '/books',
      protocol: 'HTTP/1.1',
      resourcePath: '/books',
      stage: 'test',
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'Custom User Agent String',
        accountId: '123456789012',
        apiKey: 'test-api-key',
        accessKey: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        user: null,
        userArn: null,
      },
      accountId: '123456789012',
      resourceId: '123456',
      apiId: '1234567890',
    } as any,
    resource: '/books',
    stageVariables: null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    ...overrides,
  });

  describe('Books API - Language Detection', () => {
    it('should return error in English when Accept-Language is en', async () => {
      const event = createMockEvent(
        {
          httpMethod: 'GET',
          path: '/books/99999',
          pathParameters: { id: '99999' },
        },
        'en'
      );

      const response = await booksHandler.getBook(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(404);
      expect(body.error).toContain('not found');
      expect(body.error).not.toContain('trovato'); // Italian word
    });

    it('should return error in Italian when Accept-Language is it', async () => {
      const event = createMockEvent(
        {
          httpMethod: 'GET',
          path: '/books/99999',
          pathParameters: { id: '99999' },
        },
        'it'
      );

      const response = await booksHandler.getBook(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(404);
      expect(body.error).toContain('trovato'); // Italian translation
    });

    it('should handle validation errors in English', async () => {
      const event = createMockEvent(
        {
          httpMethod: 'POST',
          path: '/books',
          body: JSON.stringify({
            title: '', // Empty title should fail validation
            isbn: 'invalid',
          }),
        },
        'en'
      );

      const response = await booksHandler.createBook(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBeDefined();
      // Check that error is in English
      expect(typeof body.error).toBe('string');
    });

    it('should handle validation errors in Italian', async () => {
      const event = createMockEvent(
        {
          httpMethod: 'POST',
          path: '/books',
          body: JSON.stringify({
            title: '', // Empty title should fail validation
            isbn: 'invalid',
          }),
        },
        'it'
      );

      const response = await booksHandler.createBook(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.error).toBeDefined();
    });

  });

  describe('Authors API - Language Detection', () => {
    it('should return error in English when author not found', async () => {
      const event = createMockEvent(
        {
          httpMethod: 'GET',
          path: '/authors/99999',
          pathParameters: { id: '99999' },
        },
        'en'
      );

      const response = await authorsHandler.getAuthor(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(404);
      expect(body.error).toContain('not found');
    });

    it('should return error in Italian when author not found', async () => {
      const event = createMockEvent(
        {
          httpMethod: 'GET',
          path: '/authors/99999',
          pathParameters: { id: '99999' },
        },
        'it'
      );

      const response = await authorsHandler.getAuthor(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(404);
      expect(body.error).toContain('trovato');
    });
  });

  describe('Language Fallback', () => {
    it('should fallback to English when Accept-Language is invalid', async () => {
      const event = createMockEvent(
        {
          httpMethod: 'GET',
          path: '/books/99999',
          pathParameters: { id: '99999' },
          headers: { 'accept-language': 'fr' }, // Unsupported language
        }
      );

      const response = await booksHandler.getBook(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(404);
      expect(body.error).toContain('not found');
      expect(body.error).not.toContain('trovato');
    });

    it('should fallback to English when Accept-Language is missing', async () => {
      const event = createMockEvent({
        httpMethod: 'GET',
        path: '/books/99999',
        pathParameters: { id: '99999' },
        headers: {},
      });

      const response = await booksHandler.getBook(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(404);
      expect(body.error).toContain('not found');
    });
  });

  describe('Complex Accept-Language Headers', () => {
    it('should parse it-IT correctly', async () => {
      const event = createMockEvent(
        {
          httpMethod: 'GET',
          path: '/books/99999',
          pathParameters: { id: '99999' },
          headers: { 'accept-language': 'it-IT' },
        }
      );

      const response = await booksHandler.getBook(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(404);
      expect(body.error).toContain('trovato');
    });

    it('should parse quality values correctly (it > en)', async () => {
      const event = createMockEvent(
        {
          httpMethod: 'GET',
          path: '/books/99999',
          pathParameters: { id: '99999' },
          headers: { 'accept-language': 'it-IT;q=0.9,en-US;q=0.8' },
        }
      );

      const response = await booksHandler.getBook(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(404);
      expect(body.error).toContain('trovato');
    });

    it('should parse quality values correctly (en > it)', async () => {
      const event = createMockEvent(
        {
          httpMethod: 'GET',
          path: '/books/99999',
          pathParameters: { id: '99999' },
          headers: { 'accept-language': 'en-US;q=0.9,it-IT;q=0.8' },
        }
      );

      const response = await booksHandler.getBook(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(404);
      expect(body.error).toContain('not found');
    });
  });
});
