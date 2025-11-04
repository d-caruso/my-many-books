// ================================================================
// src/routes/adminRoutes.ts
// Admin-only routes - all require authentication + admin role
// ================================================================

import { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { statsController } from '../controllers/admin/StatsController';
import { adminUserController } from '../controllers/admin/AdminUserController';
import { adminBookController } from '../controllers/admin/AdminBookController';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();
//const statsController = new StatsController();
//const adminUserController = new AdminUserController();
//const adminBookController = new AdminBookController();

// All admin routes require authentication AND admin role
router.use(authMiddleware);
router.use(requireAdmin);

// ===== STATS ENDPOINTS =====
// Dashboard summary statistics
router.get('/stats/summary',
  expressRouteWrapper(statsController.getSummary.bind(statsController))
);

// Detailed user statistics (future)
router.get('/stats/users',
  expressRouteWrapper(statsController.getUserStats.bind(statsController))
);

// Detailed book statistics (future)
router.get('/stats/books',
  expressRouteWrapper(statsController.getBookStats.bind(statsController))
);

// ===== USER MANAGEMENT ENDPOINTS (Phase 3) =====
// Get all users with pagination and search
router.get('/users',
  expressRouteWrapper(adminUserController.getAllUsers.bind(adminUserController))
);

// Get single user by ID
router.get('/users/:id',
  expressRouteWrapper(adminUserController.getUserById.bind(adminUserController))
);

// Update user details
router.put('/users/:id',
  expressRouteWrapper(adminUserController.updateUser.bind(adminUserController))
);

// Delete user
router.delete('/users/:id',
  expressRouteWrapper(adminUserController.deleteUser.bind(adminUserController))
);

// ===== BOOK MANAGEMENT ENDPOINTS (Phase 4) =====
// Get all books with pagination and search
router.get('/books',
  expressRouteWrapper(adminBookController.getAllBooks.bind(adminBookController))
);

// Get single book by ID
router.get('/books/:id',
  expressRouteWrapper(adminBookController.getBookById.bind(adminBookController))
);

// Update book details
router.put('/books/:id',
  expressRouteWrapper(adminBookController.updateBook.bind(adminBookController))
);

// Delete book
router.delete('/books/:id',
  expressRouteWrapper(adminBookController.deleteBook.bind(adminBookController))
);

export default router;
