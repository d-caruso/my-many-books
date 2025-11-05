// ================================================================
// src/routes/categoryRoutes.ts
// Category management routes
// ================================================================

import { Router } from 'express';
import { categoryController } from '../controllers/CategoryController';
import { AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';
import { ApiResponse } from '../common/ApiResponse';
import { UniversalRequest } from '../types';
import { standardLimiter } from '../middleware/rateLimiters';

const router = Router();

// Apply rate limiting to category routes
router.use(standardLimiter);

// A generic handler for Express routes that wraps the controller methods
const expressRouteWrapper = (
  controllerMethod: (request: UniversalRequest) => Promise<ApiResponse>
) => {
  return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Use validated data if available, otherwise use originals
      const body: unknown = req.validated?.body ?? req.body;
      const query: Record<string, unknown> =
        req.validated?.query ?? (req.query as Record<string, unknown>);
      const params: Record<string, unknown> =
        req.validated?.params ?? (req.params as Record<string, unknown>);

      // Convert Express request to UniversalRequest
      const universalRequest: UniversalRequest = {
        body: body,
        queryStringParameters: query as { [key: string]: string | undefined },
        pathParameters: params as { [key: string]: string | undefined },
        user: req.user || undefined,
      };

      // Call the controller method
      const result = await controllerMethod(universalRequest);

      // Convert ApiResponse to Express response
      res.status(result.statusCode).json({
        success: result.success,
        data: result.data,
        ...(result.error && { error: result.error }),
        ...(result.message && { message: result.message }),
        ...(result.meta && { meta: result.meta }),
      });
    } catch (error) {
      console.error('Error in route handler:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};

// List all categories with optional search
router.get('/', expressRouteWrapper(categoryController.listCategories.bind(categoryController)));

// Get category by ID
router.get('/:id', expressRouteWrapper(categoryController.getCategory.bind(categoryController)));

// Create new category
router.post('/', expressRouteWrapper(categoryController.createCategory.bind(categoryController)));

// Update category
router.put('/:id', expressRouteWrapper(categoryController.updateCategory.bind(categoryController)));

// Delete category
router.delete(
  '/:id',
  expressRouteWrapper(categoryController.deleteCategory.bind(categoryController))
);

export default router;
