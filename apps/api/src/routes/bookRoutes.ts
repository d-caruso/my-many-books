// ================================================================
// src/routes/bookRoutes.ts
// Book management routes for authenticated users
// ================================================================

import { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { BookController } from '../controllers/BookController';
import { authMiddleware } from '../middleware/auth';
import { standardLimiter, searchLimiter } from '../middleware/rateLimiters';

const router = Router();
const bookController = new BookController();

// All book routes require authentication
router.use(authMiddleware);

// Book search operations (must come before /:id to avoid matching 'search' as an ID)
// Apply stricter rate limiting to search endpoints
router.get('/search', searchLimiter, expressRouteWrapper(bookController.searchBooks.bind(bookController)));
router.get(
  '/search/isbn/:isbn',
  searchLimiter,
  expressRouteWrapper(bookController.searchByIsbnForUser.bind(bookController))
);

// Book CRUD operations - apply standard rate limiting
router.use(standardLimiter);

router.get('/', expressRouteWrapper(bookController.getUserBooks.bind(bookController)));
router.get('/:id', expressRouteWrapper(bookController.getBookById.bind(bookController)));
router.post('/', expressRouteWrapper(bookController.createBookForUser.bind(bookController)));
router.put('/:id', expressRouteWrapper(bookController.updateBookForUser.bind(bookController)));
router.patch('/:id', expressRouteWrapper(bookController.patchBookForUser.bind(bookController)));
router.delete('/:id', expressRouteWrapper(bookController.deleteBookForUser.bind(bookController)));

export default router;
