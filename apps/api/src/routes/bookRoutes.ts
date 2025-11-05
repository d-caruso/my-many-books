// ================================================================
// src/routes/bookRoutes.ts
// Book management routes for authenticated users
// ================================================================

import { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { BookController } from '../controllers/BookController';
import { authMiddleware } from '../middleware/auth';
import {
  standardLimiter,
  searchLimiter,
  readLimiter,
  writeLimiter,
} from '../middleware/rateLimiters';
import {
  validateQuery,
  validateBody,
  validateParams,
  searchBooksQuerySchema,
  getBooksQuerySchema,
  createBookSchema,
  updateBookSchema,
  patchBookSchema,
  bookIdParamSchema,
  isbnParamSchema,
} from '../validation';

const router = Router();
const bookController = new BookController();

// All book routes require authentication
router.use(authMiddleware);

// Book search operations (must come before /:id to avoid matching 'search' as an ID)
// Apply stricter rate limiting to search endpoints
router.get(
  '/search',
  searchLimiter,
  validateQuery(searchBooksQuerySchema),
  expressRouteWrapper(bookController.searchBooks.bind(bookController))
); // Rimossa la riga vuota e corretta l'indentazione.

router.get(
  '/search/isbn/:isbn',
  searchLimiter,
  validateParams(isbnParamSchema),
  expressRouteWrapper(bookController.searchByIsbnForUser.bind(bookController))
);

// Book CRUD operations - apply standard rate limiting for backwards compatibility
router.use(standardLimiter);

// Apply granular rate limiting: separate limits for read vs write operations
router.get(
  '/',
  readLimiter,
  validateQuery(getBooksQuerySchema),
  expressRouteWrapper(bookController.getUserBooks.bind(bookController))
);

router.get(
  '/:id',
  readLimiter,
  validateParams(bookIdParamSchema),
  expressRouteWrapper(bookController.getBookById.bind(bookController))
);

router.post(
  '/',
  writeLimiter,
  validateBody(createBookSchema),
  expressRouteWrapper(bookController.createBookForUser.bind(bookController))
);

// Allineamento standard (multi-line se ci sono molti middleware)
router.put(
  '/:id',
  writeLimiter,
  validateParams(bookIdParamSchema),
  validateBody(updateBookSchema),
  expressRouteWrapper(bookController.updateBookForUser.bind(bookController))
);

router.patch(
  '/:id',
  writeLimiter,
  validateParams(bookIdParamSchema),
  validateBody(patchBookSchema),
  expressRouteWrapper(bookController.patchBookForUser.bind(bookController))
);

router.delete(
  '/:id',
  writeLimiter,
  validateParams(bookIdParamSchema),
  expressRouteWrapper(bookController.deleteBookForUser.bind(bookController))
);

export default router;
