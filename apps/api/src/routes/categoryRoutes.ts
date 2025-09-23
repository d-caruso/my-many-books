// ================================================================
// src/routes/categoryRoutes.ts
// Category management routes
// ================================================================

import { Router } from 'express';
import { categoryController } from '../controllers/CategoryController';
import { AuthenticatedRequest } from '../middleware/auth';
import { Response } from 'express';

const router = Router();

// A generic handler for Express routes that wraps the controller methods
const expressRouteWrapper = (
  controllerMethod: (
    req: AuthenticatedRequest,
    res: Response
  ) => Promise<{ statusCode: number; body: unknown }>
) => {
  return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // The controller methods now just return the data and status code
      const result = await controllerMethod(req, res);
      res.status(result.statusCode).json(result.body);
    } catch (error) {
      console.error('Error in route handler:', error);
      res.status(500).json({
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
