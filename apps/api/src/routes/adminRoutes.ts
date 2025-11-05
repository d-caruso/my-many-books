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
import { adminLimiter, readLimiter, writeLimiter } from '../middleware/rateLimiters';

const router = Router();
//const statsController = new StatsController();
//const adminUserController = new AdminUserController();
//const adminBookController = new AdminBookController();

// All admin routes require authentication AND admin role
router.use(authMiddleware);
router.use(requireAdmin);

// Apply base admin rate limiting to all admin routes
router.use(adminLimiter);

// ===== STATS ENDPOINTS (READ-ONLY) =====
// Dashboard summary statistics
router.get('/stats/summary', readLimiter, expressRouteWrapper(statsController.getSummary.bind(statsController)));

// Detailed user statistics (future)
router.get('/stats/users', readLimiter, expressRouteWrapper(statsController.getUserStats.bind(statsController)));

// Detailed book statistics (future)
router.get('/stats/books', readLimiter, expressRouteWrapper(statsController.getBookStats.bind(statsController)));

// ===== USER MANAGEMENT ENDPOINTS (Phase 3) =====
// Get all users with pagination and search (READ)
router.get(
  '/users',
  readLimiter,
  expressRouteWrapper(adminUserController.getAllUsers.bind(adminUserController))
);

// Get single user by ID (READ)
router.get(
  '/users/:id',
  readLimiter,
  expressRouteWrapper(adminUserController.getUserById.bind(adminUserController))
);

// Update user details (WRITE)
router.put(
  '/users/:id',
  writeLimiter,
  expressRouteWrapper(adminUserController.updateUser.bind(adminUserController))
);

// Delete user (WRITE)
router.delete(
  '/users/:id',
  writeLimiter,
  expressRouteWrapper(adminUserController.deleteUser.bind(adminUserController))
);

// ===== BOOK MANAGEMENT ENDPOINTS (Phase 4) =====
// Get all books with pagination and search (READ)
router.get(
  '/books',
  readLimiter,
  expressRouteWrapper(adminBookController.getAllBooks.bind(adminBookController))
);

// Get single book by ID (READ)
router.get(
  '/books/:id',
  readLimiter,
  expressRouteWrapper(adminBookController.getBookById.bind(adminBookController))
);

// Update book details (WRITE)
router.put(
  '/books/:id',
  writeLimiter,
  expressRouteWrapper(adminBookController.updateBook.bind(adminBookController))
);

// Delete book (WRITE)
router.delete(
  '/books/:id',
  writeLimiter,
  expressRouteWrapper(adminBookController.deleteBook.bind(adminBookController))
);

export default router;
