// ================================================================
// src/routes/authorRoutes.ts
// Author management routes
// ================================================================

import { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { authorController } from '../controllers/AuthorController';
import { authMiddleware } from '../middleware/auth';
import { standardLimiter } from '../middleware/rateLimiters';

const router = Router();

// Apply authentication middleware to all author routes
router.use(authMiddleware);

// Apply rate limiting to author routes
router.use(standardLimiter);

// Map the routes to the controller methods using the wrapper
router.get('/', expressRouteWrapper(authorController.listAuthors.bind(authorController)));
router.get('/:id', expressRouteWrapper(authorController.getAuthor.bind(authorController)));
router.post('/', expressRouteWrapper(authorController.createAuthor.bind(authorController)));
router.put('/:id', expressRouteWrapper(authorController.updateAuthor.bind(authorController)));
router.delete('/:id', expressRouteWrapper(authorController.deleteAuthor.bind(authorController)));
router.get(
  '/:id/books',
  expressRouteWrapper(authorController.getAuthorBooks.bind(authorController))
);

export default router;
