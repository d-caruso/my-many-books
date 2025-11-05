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
import {
  validateQuery,
  validateBody,
  validateParams,
  adminGetUsersQuerySchema,
  adminUpdateUserSchema,
  adminGetBooksQuerySchema,
  adminUpdateBookSchema,
  adminIdParamSchema,
  adminStatsQuerySchema,
} from '../validation';
import { adminLimiter, readLimiter, writeLimiter } from '../middleware/rateLimiters';

const router = Router();

// All admin routes require authentication AND admin role
router.use(authMiddleware);
router.use(requireAdmin);

// Apply base admin rate limiting to all admin routes
router.use(adminLimiter);

// ===== STATS ENDPOINTS (READ-ONLY) =====
// Dashboard summary statistics
router.get(
  '/stats/summary',
  readLimiter,
  validateQuery(adminStatsQuerySchema),
  expressRouteWrapper(statsController.getSummary.bind(statsController))
);

// Detailed user statistics (future)
router.get(
  '/stats/users',
  readLimiter,
  validateQuery(adminStatsQuerySchema),
  expressRouteWrapper(statsController.getUserStats.bind(statsController))
);

// Detailed book statistics (future)
router.get(
  '/stats/books',
  readLimiter,
  validateQuery(adminStatsQuerySchema),
  expressRouteWrapper(statsController.getBookStats.bind(statsController))
);

// ===== USER MANAGEMENT ENDPOINTS =====
// Get all users with pagination and search
router.get(
  '/users',
  validateQuery(adminGetUsersQuerySchema),
  expressRouteWrapper(adminUserController.getAllUsers.bind(adminUserController))
);

// Get single user by ID
router.get(
  '/users/:id',
  validateQuery(adminStatsQuerySchema),
  expressRouteWrapper(adminUserController.getUserById.bind(adminUserController))
);

// Update user details (WRITE)
router.put(
  '/users/:id',
  writeLimiter,
  validateParams(adminIdParamSchema),
  validateBody(adminUpdateUserSchema),
  expressRouteWrapper(adminUserController.updateUser.bind(adminUserController))
);

// Delete user (WRITE)
router.delete(
  '/users/:id',
  writeLimiter,
  validateParams(adminIdParamSchema),
  expressRouteWrapper(adminUserController.deleteUser.bind(adminUserController))
);

// ===== BOOK MANAGEMENT ENDPOINTS =====
// Get all books with pagination and search (READ)
router.get(
  '/books',
  readLimiter,
  validateQuery(adminGetBooksQuerySchema),
  expressRouteWrapper(adminBookController.getAllBooks.bind(adminBookController))
);

// Get single book by ID (READ)
router.get(
  '/books/:id',
  readLimiter,
  validateParams(adminIdParamSchema),
  expressRouteWrapper(adminBookController.getBookById.bind(adminBookController))
);

// Update book details (WRITE)
router.put(
  '/books/:id',
  writeLimiter,
  validateParams(adminIdParamSchema),
  validateBody(adminUpdateBookSchema),
  expressRouteWrapper(adminBookController.updateBook.bind(adminBookController))
);

// Delete book (WRITE)
router.delete(
  '/books/:id',
  writeLimiter,
  validateParams(adminIdParamSchema),
  expressRouteWrapper(adminBookController.deleteBook.bind(adminBookController))
);

export default router;
