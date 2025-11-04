// ================================================================
// src/routes/bookRoutes.ts
// Book management routes for authenticated users
// ================================================================

import { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { BookController } from '../controllers/BookController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const bookController = new BookController();

// All book routes require authentication
router.use(authMiddleware);

// Book search operations (must come before /:id to avoid matching 'search' as an ID)
router.get('/search', expressRouteWrapper(bookController.searchBooks.bind(bookController)));
router.get(
  '/search/isbn/:isbn',
  expressRouteWrapper(bookController.searchByIsbnForUser.bind(bookController))
);

// Book CRUD operations
router.get('/', expressRouteWrapper(bookController.getUserBooks.bind(bookController)));
router.get('/:id', expressRouteWrapper(bookController.getBookById.bind(bookController)));
router.post('/', expressRouteWrapper(bookController.createBookForUser.bind(bookController)));
router.put('/:id', expressRouteWrapper(bookController.updateBookForUser.bind(bookController)));
router.patch('/:id', expressRouteWrapper(bookController.patchBookForUser.bind(bookController)));
router.delete('/:id', expressRouteWrapper(bookController.deleteBookForUser.bind(bookController)));

export default router;
