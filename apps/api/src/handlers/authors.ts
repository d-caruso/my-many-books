// ================================================================
// src/handlers/authors.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authorController } from '../controllers/AuthorController';
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

export const createAuthor = withMiddleware(
  lambdaAdapter(authorController.createAuthor.bind(authorController))
);

export const getAuthor = withMiddleware(
  lambdaAdapter(authorController.getAuthor.bind(authorController))
);

export const updateAuthor = withMiddleware(
  lambdaAdapter(authorController.updateAuthor.bind(authorController))
);

export const deleteAuthor = withMiddleware(
  lambdaAdapter(authorController.deleteAuthor.bind(authorController))
);

export const listAuthors = withMiddleware(
  lambdaAdapter(authorController.listAuthors.bind(authorController))
);

export const getAuthorBooks = withMiddleware(
  lambdaAdapter(authorController.getAuthorBooks.bind(authorController))
);
