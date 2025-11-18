// ================================================================
// src/handlers/admin.ts
// Lambda handlers for admin endpoints
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { statsController } from '../controllers/admin/StatsController';
import { adminUserController } from '../controllers/admin/AdminUserController';
import { adminBookController } from '../controllers/admin/AdminBookController';
import { requestLogger } from '../middleware/requestLogger';
import { corsHandler } from '../middleware/cors';
import { errorHandler } from '../middleware/errorHandler';
import { lambdaAdapter } from '../adapters/lambdaAdapter';

import { authAdminMiddleware } from '../middleware/authAdmin';

const withMiddleware = (
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
): ((event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>) => {
  return authAdminMiddleware(
    async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
    }
  );
};

// ===== STATS ENDPOINTS =====
export const getAdminStatsSummary = withMiddleware(
  lambdaAdapter(statsController.getSummary.bind(statsController))
);

export const getAdminStatsUsers = withMiddleware(
  lambdaAdapter(statsController.getUserStats.bind(statsController))
);

export const getAdminStatsBooks = withMiddleware(
  lambdaAdapter(statsController.getBookStats.bind(statsController))
);

// ===== USER MANAGEMENT ENDPOINTS =====
export const getAdminUsers = withMiddleware(
  lambdaAdapter(adminUserController.getAllUsers.bind(adminUserController))
);

export const getAdminUserById = withMiddleware(
  lambdaAdapter(adminUserController.getUserById.bind(adminUserController))
);

export const updateAdminUser = withMiddleware(
  lambdaAdapter(adminUserController.updateUser.bind(adminUserController))
);

export const deleteAdminUser = withMiddleware(
  lambdaAdapter(adminUserController.deleteUser.bind(adminUserController))
);

// ===== BOOK MANAGEMENT ENDPOINTS =====
export const getAdminBooks = withMiddleware(
  lambdaAdapter(adminBookController.getAllBooks.bind(adminBookController))
);

export const getAdminBookById = withMiddleware(
  lambdaAdapter(adminBookController.getBookById.bind(adminBookController))
);

export const updateAdminBook = withMiddleware(
  lambdaAdapter(adminBookController.updateBook.bind(adminBookController))
);

export const deleteAdminBook = withMiddleware(
  lambdaAdapter(adminBookController.deleteBook.bind(adminBookController))
);
