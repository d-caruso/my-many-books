// ================================================================
// src/handlers/books.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { bookController } from '../controllers/BookController';
import { requestLogger } from '../middleware/requestLogger';
import { corsHandler } from '../middleware/cors';
import { errorHandler } from '../middleware/errorHandler';
import { lambdaAdapter } from '../adapters/lambdaAdapter';

const withMiddleware = (
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      // Apply CORS first
      if (event.httpMethod === 'OPTIONS') {
        return corsHandler(event);
      }

      // Log request
      requestLogger(event);

      // Execute handler
      const result = await handler(event);

      // Apply CORS to response
      return {
        ...result,
        headers: {
          ...result.headers,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers':
            'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
      };
    } catch (error) {
      return errorHandler(error as Error);
    }
  };
};

export const createBook = withMiddleware(
  lambdaAdapter(bookController.createBook.bind(bookController))
);

export const getBook = withMiddleware(lambdaAdapter(bookController.getBook.bind(bookController)));

export const updateBook = withMiddleware(
  lambdaAdapter(bookController.updateBook.bind(bookController))
);

export const deleteBook = withMiddleware(
  lambdaAdapter(bookController.deleteBook.bind(bookController))
);

export const listBooks = withMiddleware(
  lambdaAdapter(bookController.listBooks.bind(bookController))
);

export const searchBooksByIsbn = withMiddleware(
  lambdaAdapter(bookController.searchBooksByIsbn.bind(bookController))
);

export const importBookFromIsbn = withMiddleware(
  lambdaAdapter(bookController.importBookFromIsbn.bind(bookController))
);
