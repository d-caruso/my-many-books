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

// Book CRUD operations
// Now, we call the methods on the `bookController` instance
router.get('/', expressRouteWrapper(bookController.getUserBooks));
router.get('/:id', expressRouteWrapper(bookController.getBookById));
router.post('/', expressRouteWrapper(bookController.createBookForUser));
router.put('/:id', expressRouteWrapper(bookController.updateBookForUser));
router.delete('/:id', expressRouteWrapper(bookController.deleteBookForUser));

// Book search operations
router.get('/search/isbn/:isbn', expressRouteWrapper(bookController.searchByIsbnForUser));

export default router;