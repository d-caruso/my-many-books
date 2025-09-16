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

// Main router function for single Lambda deployment
export const routeRequest = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return corsHandler(event);
    }

    // Log request
    requestLogger(event);

    const { httpMethod, resource } = event;

    // Book routes
    if (resource.startsWith('/books')) {
      switch (resource) {
        case '/books':
          if (httpMethod === 'GET') return await adaptedBookController.listBooks(event);
          if (httpMethod === 'POST') return await adaptedBookController.createBook(event);
          break;
        case '/books/{id}':
          if (httpMethod === 'GET') return await adaptedBookController.getBook(event);
          if (httpMethod === 'PUT') return await adaptedBookController.updateBook(event);
          if (httpMethod === 'DELETE') return await adaptedBookController.deleteBook(event);
          break;
        case '/books/search/isbn':
          if (httpMethod === 'GET') return await adaptedBookController.searchBooksByIsbn(event);
          break;
        case '/books/import/isbn':
          if (httpMethod === 'POST') return await adaptedBookController.importBookFromIsbn(event);
          break;
      }
    }

    // Author routes
    if (resource.startsWith('/authors')) {
      switch (resource) {
        case '/authors':
          if (httpMethod === 'GET') return await adaptedAuthorController.listAuthors(event);
          if (httpMethod === 'POST') return await adaptedAuthorController.createAuthor(event);
          break;
        case '/authors/{id}':
          if (httpMethod === 'GET') return await adaptedAuthorController.getAuthor(event);
          if (httpMethod === 'PUT') return await adaptedAuthorController.updateAuthor(event);
          if (httpMethod === 'DELETE') return await adaptedAuthorController.deleteAuthor(event);
          break;
        case '/authors/{id}/books':
          if (httpMethod === 'GET') return await adaptedAuthorController.getAuthorBooks(event);
          break;
      }
    }

    // Category routes
    if (resource.startsWith('/categories')) {
      switch (resource) {
        case '/categories':
          if (httpMethod === 'GET') return await adaptedCategoryController.listCategories(event);
          if (httpMethod === 'POST') return await adaptedCategoryController.createCategory(event);
          break;
        case '/categories/{id}':
          if (httpMethod === 'GET') return await adaptedCategoryController.getCategory(event);
          if (httpMethod === 'PUT') return await adaptedCategoryController.updateCategory(event);
          if (httpMethod === 'DELETE') return await adaptedCategoryController.deleteCategory(event);
          break;
        case '/categories/{id}/books':
          if (httpMethod === 'GET') return await adaptedCategoryController.getCategoryBooks(event);
          break;
      }
    }

    // ISBN service routes
    if (resource.startsWith('/isbn')) {
      switch (resource) {
        case '/isbn/lookup/{isbn}':
          if (httpMethod === 'GET') return await adaptedIsbnController.lookupBook(event);
          break;
        case '/isbn/lookup':
          if (httpMethod === 'GET') return await adaptedIsbnController.lookupBook(event);
          if (httpMethod === 'POST') return await adaptedIsbnController.batchLookupBooks(event);
          break;
        case '/isbn/search':
          if (httpMethod === 'GET') return await adaptedIsbnController.searchByTitle(event);
          break;
        case '/isbn/validate/{isbn}':
          if (httpMethod === 'GET') return await adaptedIsbnController.validateIsbn(event);
          break;
        case '/isbn/validate':
          if (httpMethod === 'GET') return await adaptedIsbnController.validateIsbn(event);
          break;
        case '/isbn/format':
          if (httpMethod === 'GET') return await adaptedIsbnController.formatIsbn(event);
          break;
        case '/isbn/health':
          if (httpMethod === 'GET') return await adaptedIsbnController.getServiceHealth(event);
          break;
        case '/isbn/stats':
          if (httpMethod === 'GET') return await adaptedIsbnController.getResilienceStats(event);
          break;
        case '/isbn/cache':
          if (httpMethod === 'DELETE') return await adaptedIsbnController.clearCache(event);
          if (httpMethod === 'GET') return await adaptedIsbnController.getCacheStats(event);
          break;
        case '/isbn/resilience':
          if (httpMethod === 'DELETE') return await adaptedIsbnController.resetResilience(event);
          break;
        case '/isbn/fallback':
          if (httpMethod === 'POST') return await adaptedIsbnController.addFallbackBook(event);
          break;
      }
    }

    // Health check route
    if (resource === '/health' && httpMethod === 'GET') {
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
        resource,
        method: httpMethod,
      }),
    };
  } catch (error) {
    return errorHandler(error as Error);
  }
};

// Export as default handler for single Lambda deployment
export const handler: APIGatewayProxyHandler = routeRequest;
