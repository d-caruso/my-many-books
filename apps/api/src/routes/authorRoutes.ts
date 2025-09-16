// ================================================================
// src/routes/authorRoutes.ts
// Author management routes
// ================================================================

import { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { authorController } from '../controllers/AuthorController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all author routes
router.use(authMiddleware);

// Map the routes to the controller methods using the wrapper
router.get('/', expressRouteWrapper(authorController.listAuthors));
router.get('/:id', expressRouteWrapper(authorController.getAuthor));
router.post('/', expressRouteWrapper(authorController.createAuthor));
router.put('/:id', expressRouteWrapper(authorController.updateAuthor));
router.delete('/:id', expressRouteWrapper(authorController.deleteAuthor));
router.get('/:id/books', expressRouteWrapper(authorController.getAuthorBooks));

export default router;