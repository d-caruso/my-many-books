// ================================================================
// src/handlers/isbn.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { isbnController } from '../controllers/IsbnController';
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

export const lookupBook = withMiddleware(
  lambdaAdapter(isbnController.lookupBook.bind(isbnController))
);

export const batchLookupBooks = withMiddleware(
  lambdaAdapter(isbnController.batchLookupBooks.bind(isbnController))
);

export const searchByTitle = withMiddleware(
  lambdaAdapter(isbnController.searchByTitle.bind(isbnController))
);

export const getServiceHealth = withMiddleware(
  lambdaAdapter(isbnController.getServiceHealth.bind(isbnController))
);

export const getResilienceStats = withMiddleware(
  lambdaAdapter(isbnController.getResilienceStats.bind(isbnController))
);

export const resetResilience = withMiddleware(
  lambdaAdapter(isbnController.resetResilience.bind(isbnController))
);

export const clearCache = withMiddleware(
  lambdaAdapter(isbnController.clearCache.bind(isbnController))
);

export const getCacheStats = withMiddleware(
  lambdaAdapter(isbnController.getCacheStats.bind(isbnController))
);

export const addFallbackBook = withMiddleware(
  lambdaAdapter(isbnController.addFallbackBook.bind(isbnController))
);

export const validateIsbn = withMiddleware(
  lambdaAdapter(isbnController.validateIsbn.bind(isbnController))
);

export const formatIsbn = withMiddleware(
  lambdaAdapter(isbnController.formatIsbn.bind(isbnController))
);
