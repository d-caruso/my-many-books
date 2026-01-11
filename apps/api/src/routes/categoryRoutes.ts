// ================================================================
// src/routes/categoryRoutes.ts
// Category management routes
// ================================================================

import express, { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { ACTIONS, RESOURCES } from '@my-many-books/shared-auth';
import { standardLimiter } from '../middleware/rateLimiters';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { container } from '../container';
import { TYPES } from '../container/types';
import { CategoryController } from '../controllers/CategoryController';

const router: express.Router = Router();
const categoryController = container.get<CategoryController>(TYPES.CategoryController);

router.use(authMiddleware);
router.use(standardLimiter);

// List all categories with optional search
router.get('/', expressRouteWrapper(categoryController.listCategories.bind(categoryController)));

// Get category by ID
router.get('/:id', expressRouteWrapper(categoryController.getCategory.bind(categoryController)));

// Create new category - protected
router.post(
  '/',
  requirePermission(ACTIONS.CREATE, RESOURCES.CATEGORY),
  expressRouteWrapper(categoryController.createCategory.bind(categoryController))
);

// Update category - protected
router.put(
  '/:id',
  requirePermission(ACTIONS.UPDATE, RESOURCES.CATEGORY),
  expressRouteWrapper(categoryController.updateCategory.bind(categoryController))
);

// Delete category - protected
router.delete(
  '/:id',
  requirePermission(ACTIONS.DELETE, RESOURCES.CATEGORY),
  expressRouteWrapper(categoryController.deleteCategory.bind(categoryController))
);

router.get(
  '/:id/books',
  expressRouteWrapper(categoryController.getCategoryBooks.bind(categoryController))
);

export default router;
