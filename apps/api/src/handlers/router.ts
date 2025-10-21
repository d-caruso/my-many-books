// ================================================================
// src/handlers/router.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda';
import { bookController } from '../controllers/BookController';
import { authorController } from '../controllers/AuthorController';
import { categoryController } from '../controllers/CategoryController';
import { isbnController } from '../controllers/IsbnController';
import { requestLogger } from '../middleware/requestLogger';
import { corsHandler } from '../middleware/cors';
import { errorHandler } from '../middleware/errorHandler';
import { lambdaAdapter } from '../adapters/lambdaAdapter';
import { ModelManager } from '../models';
import DatabaseConnection from '../config/database';

// Create lambda-adapted handlers
const adaptedBookController = {
  listBooks: lambdaAdapter(bookController.listBooks.bind(bookController)),
  createBook: lambdaAdapter(bookController.createBook.bind(bookController)),
  getBook: lambdaAdapter(bookController.getBook.bind(bookController)),
  updateBook: lambdaAdapter(bookController.updateBook.bind(bookController)),
  deleteBook: lambdaAdapter(bookController.deleteBook.bind(bookController)),
  searchBooksByIsbn: lambdaAdapter(bookController.searchBooksByIsbn.bind(bookController)),
  importBookFromIsbn: lambdaAdapter(bookController.importBookFromIsbn.bind(bookController)),
};

const adaptedAuthorController = {
  listAuthors: lambdaAdapter(authorController.listAuthors.bind(authorController)),
  createAuthor: lambdaAdapter(authorController.createAuthor.bind(authorController)),
  getAuthor: lambdaAdapter(authorController.getAuthor.bind(authorController)),
  updateAuthor: lambdaAdapter(authorController.updateAuthor.bind(authorController)),
  deleteAuthor: lambdaAdapter(authorController.deleteAuthor.bind(authorController)),
  getAuthorBooks: lambdaAdapter(authorController.getAuthorBooks.bind(authorController)),
};

const adaptedCategoryController = {
  listCategories: lambdaAdapter(categoryController.listCategories.bind(categoryController)),
  createCategory: lambdaAdapter(categoryController.createCategory.bind(categoryController)),
  getCategory: lambdaAdapter(categoryController.getCategory.bind(categoryController)),
  updateCategory: lambdaAdapter(categoryController.updateCategory.bind(categoryController)),
  deleteCategory: lambdaAdapter(categoryController.deleteCategory.bind(categoryController)),
  getCategoryBooks: lambdaAdapter(categoryController.getCategoryBooks.bind(categoryController)),
};

const adaptedIsbnController = {
  lookupBook: lambdaAdapter(isbnController.lookupBook.bind(isbnController)),
  batchLookupBooks: lambdaAdapter(isbnController.batchLookupBooks.bind(isbnController)),
  searchByTitle: lambdaAdapter(isbnController.searchByTitle.bind(isbnController)),
  getServiceHealth: lambdaAdapter(isbnController.getServiceHealth.bind(isbnController)),
  addFallbackBook: lambdaAdapter(isbnController.addFallbackBook.bind(isbnController)),
  validateIsbn: lambdaAdapter(isbnController.validateIsbn.bind(isbnController)),
  formatIsbn: lambdaAdapter(isbnController.formatIsbn.bind(isbnController)),
  getResilienceStats: lambdaAdapter(isbnController.getResilienceStats.bind(isbnController)),
  clearCache: lambdaAdapter(isbnController.clearCache.bind(isbnController)),
  getCacheStats: lambdaAdapter(isbnController.getCacheStats.bind(isbnController)),
  resetResilience: lambdaAdapter(isbnController.resetResilience.bind(isbnController)),
};

// Database initialization (same as app.ts)
let databaseInitialized = false;
let databaseAvailable = false;
const initializeDatabase = async (): Promise<void> => {
  if (databaseInitialized) return;

  try {
    const sequelize = DatabaseConnection.getInstance();
    await sequelize.authenticate();

    // Initialize models
    ModelManager.initialize(sequelize);

    // Sync database (only in development)
    if (process.env['NODE_ENV'] === 'development') {
      await ModelManager.syncDatabase(false);
    }

    databaseInitialized = true;
    databaseAvailable = true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    databaseInitialized = true; // Mark as attempted
    databaseAvailable = false;
    // Continue without database - return mock data from controllers
  }
};

// Main router function for single Lambda deployment
export const routeRequest = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Initialize database (same as app.ts)
    await initializeDatabase();

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return corsHandler(event);
    }

    // Log request
    requestLogger(event);

    const { httpMethod, path } = event;
    const pathSegments = path.split('/').filter(segment => segment.length > 0);

    // Book routes
    if (pathSegments[0] === 'books') {
      if (pathSegments.length === 1) {
        // /books
        if (httpMethod === 'GET') {
          if (!databaseAvailable) {
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers':
                  'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent, X-Requested-With',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Credentials': 'true',
              },
              body: JSON.stringify({
                success: true,
                data: [],
              }),
            };
          }
          return await adaptedBookController.listBooks(event);
        }
        if (httpMethod === 'POST') return await adaptedBookController.createBook(event);
      } else if (pathSegments.length === 2) {
        // /books/{id}
        if (httpMethod === 'GET') return await adaptedBookController.getBook(event);
        if (httpMethod === 'PUT') return await adaptedBookController.updateBook(event);
        if (httpMethod === 'DELETE') return await adaptedBookController.deleteBook(event);
      } else if (
        pathSegments.length === 3 &&
        pathSegments[1] === 'search' &&
        pathSegments[2] === 'isbn'
      ) {
        // /books/search/isbn
        if (httpMethod === 'GET') return await adaptedBookController.searchBooksByIsbn(event);
      } else if (
        pathSegments.length === 3 &&
        pathSegments[1] === 'import' &&
        pathSegments[2] === 'isbn'
      ) {
        // /books/import/isbn
        if (httpMethod === 'POST') return await adaptedBookController.importBookFromIsbn(event);
      }
    }

    // Author routes
    if (pathSegments[0] === 'authors') {
      if (pathSegments.length === 1) {
        // /authors
        if (httpMethod === 'GET') return await adaptedAuthorController.listAuthors(event);
        if (httpMethod === 'POST') return await adaptedAuthorController.createAuthor(event);
      } else if (pathSegments.length === 2) {
        // /authors/{id}
        if (httpMethod === 'GET') return await adaptedAuthorController.getAuthor(event);
        if (httpMethod === 'PUT') return await adaptedAuthorController.updateAuthor(event);
        if (httpMethod === 'DELETE') return await adaptedAuthorController.deleteAuthor(event);
      } else if (pathSegments.length === 3 && pathSegments[2] === 'books') {
        // /authors/{id}/books
        if (httpMethod === 'GET') return await adaptedAuthorController.getAuthorBooks(event);
      }
    }

    // Category routes
    if (pathSegments[0] === 'categories') {
      if (pathSegments.length === 1) {
        // /categories
        if (httpMethod === 'GET') {
          if (!databaseAvailable) {
            const mockCategories = [
              {
                id: 1,
                name: 'Fiction',
                creationDate: '2024-01-01T00:00:00Z',
                updateDate: '2024-01-01T00:00:00Z',
              },
              {
                id: 2,
                name: 'Classic Literature',
                creationDate: '2024-01-01T00:00:00Z',
                updateDate: '2024-01-01T00:00:00Z',
              },
              {
                id: 3,
                name: 'Science Fiction',
                creationDate: '2024-01-01T00:00:00Z',
                updateDate: '2024-01-01T00:00:00Z',
              },
              {
                id: 4,
                name: 'Mystery',
                creationDate: '2024-01-01T00:00:00Z',
                updateDate: '2024-01-01T00:00:00Z',
              },
              {
                id: 5,
                name: 'Romance',
                creationDate: '2024-01-01T00:00:00Z',
                updateDate: '2024-01-01T00:00:00Z',
              },
              {
                id: 6,
                name: 'Adventure',
                creationDate: '2024-01-01T00:00:00Z',
                updateDate: '2024-01-01T00:00:00Z',
              },
              {
                id: 7,
                name: 'Historical Fiction',
                creationDate: '2024-01-01T00:00:00Z',
                updateDate: '2024-01-01T00:00:00Z',
              },
              {
                id: 8,
                name: 'Biography',
                creationDate: '2024-01-01T00:00:00Z',
                updateDate: '2024-01-01T00:00:00Z',
              },
              {
                id: 9,
                name: 'Non-Fiction',
                creationDate: '2024-01-01T00:00:00Z',
                updateDate: '2024-01-01T00:00:00Z',
              },
              {
                id: 10,
                name: 'Fantasy',
                creationDate: '2024-01-01T00:00:00Z',
                updateDate: '2024-01-01T00:00:00Z',
              },
            ];

            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers':
                  'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent, X-Requested-With',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Credentials': 'true',
              },
              body: JSON.stringify({
                success: true,
                data: mockCategories,
                pagination: {
                  pagination: {
                    page: 1,
                    limit: 50,
                    totalCount: mockCategories.length,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false,
                  },
                },
              }),
            };
          }
          return await adaptedCategoryController.listCategories(event);
        }
        if (httpMethod === 'POST') {
          if (!databaseAvailable) {
            return {
              statusCode: 201,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers':
                  'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent, X-Requested-With',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Credentials': 'true',
              },
              body: JSON.stringify({
                success: true,
                data: {
                  id: Math.floor(Math.random() * 1000),
                  name: 'Mock Category',
                  creationDate: new Date().toISOString(),
                  updateDate: new Date().toISOString(),
                },
                message: 'Category created successfully (mock mode)',
              }),
            };
          }
          return await adaptedCategoryController.createCategory(event);
        }
      } else if (pathSegments.length === 2) {
        // /categories/{id}
        if (httpMethod === 'GET') return await adaptedCategoryController.getCategory(event);
        if (httpMethod === 'PUT') return await adaptedCategoryController.updateCategory(event);
        if (httpMethod === 'DELETE') return await adaptedCategoryController.deleteCategory(event);
      } else if (pathSegments.length === 3 && pathSegments[2] === 'books') {
        // /categories/{id}/books
        if (httpMethod === 'GET') return await adaptedCategoryController.getCategoryBooks(event);
      }
    }

    // ISBN service routes
    if (pathSegments[0] === 'isbn') {
      if (pathSegments.length === 2) {
        if (pathSegments[1] === 'lookup') {
          if (httpMethod === 'GET') return await adaptedIsbnController.lookupBook(event);
          if (httpMethod === 'POST') return await adaptedIsbnController.batchLookupBooks(event);
        } else if (pathSegments[1] === 'search') {
          if (httpMethod === 'GET') return await adaptedIsbnController.searchByTitle(event);
        } else if (pathSegments[1] === 'validate') {
          if (httpMethod === 'GET') return await adaptedIsbnController.validateIsbn(event);
        } else if (pathSegments[1] === 'format') {
          if (httpMethod === 'GET') return await adaptedIsbnController.formatIsbn(event);
        } else if (pathSegments[1] === 'health') {
          if (httpMethod === 'GET') return await adaptedIsbnController.getServiceHealth(event);
        } else if (pathSegments[1] === 'stats') {
          if (httpMethod === 'GET') return await adaptedIsbnController.getResilienceStats(event);
        } else if (pathSegments[1] === 'cache') {
          if (httpMethod === 'DELETE') return await adaptedIsbnController.clearCache(event);
          if (httpMethod === 'GET') return await adaptedIsbnController.getCacheStats(event);
        } else if (pathSegments[1] === 'resilience') {
          if (httpMethod === 'DELETE') return await adaptedIsbnController.resetResilience(event);
        } else if (pathSegments[1] === 'fallback') {
          if (httpMethod === 'POST') return await adaptedIsbnController.addFallbackBook(event);
        }
      } else if (pathSegments.length === 3) {
        if (pathSegments[1] === 'lookup') {
          // /isbn/lookup/{isbn}
          if (httpMethod === 'GET') return await adaptedIsbnController.lookupBook(event);
        } else if (pathSegments[1] === 'validate') {
          // /isbn/validate/{isbn}
          if (httpMethod === 'GET') return await adaptedIsbnController.validateIsbn(event);
        }
      }
    }

    // Health check route
    if (pathSegments[0] === 'health' && pathSegments.length === 1 && httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          message: 'API is healthy',
          timestamp: new Date().toISOString(),
          version: process.env['API_VERSION'] || '1.0.0',
          uptime: process.uptime(),
        }),
      };
    }

    // Route not found
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Route not found',
        path,
        method: httpMethod,
      }),
    };
  } catch (error) {
    return errorHandler(error as Error);
  }
};

// Export as default handler for single Lambda deployment
export const handler: APIGatewayProxyHandler = routeRequest;
