// ================================================================
// src/handlers/categories.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { categoryController } from '../controllers/CategoryController';
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

export const createCategory = withMiddleware(
  lambdaAdapter(categoryController.createCategory.bind(categoryController))
);

export const getCategory = withMiddleware(
  lambdaAdapter(categoryController.getCategory.bind(categoryController))
);

export const updateCategory = withMiddleware(
  lambdaAdapter(categoryController.updateCategory.bind(categoryController))
);

export const deleteCategory = withMiddleware(
  lambdaAdapter(categoryController.deleteCategory.bind(categoryController))
);

export const listCategories = withMiddleware(
  lambdaAdapter(categoryController.listCategories.bind(categoryController))
);

export const getCategoryBooks = withMiddleware(
  lambdaAdapter(categoryController.getCategoryBooks.bind(categoryController))
);