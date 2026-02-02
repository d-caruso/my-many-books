// ================================================================
// src/routes/adminRoutes.ts
// Admin-only routes - all require authentication + admin role
// ================================================================

import express, { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { statsController } from '../controllers/admin/StatsController';
import { AdminUserController } from '../controllers/admin/AdminUserController';
import { adminBookController } from '../controllers/admin/AdminBookController';
import { adminSettingsController } from '../controllers/admin/AdminSettingsController';
import { adminMobileAppSettingsController } from '../controllers/admin/AdminMobileAppSettingsController';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { ACTIONS, RESOURCES } from '@my-many-books/shared-auth';
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
import { container } from '../container';
import { TYPES } from '../container/types';
import { adminUpdateMobileAppSettingsSchema } from '@/validation/schemas/admin.schema';

const router: express.Router = Router();
const adminUserController = container.get<AdminUserController>(TYPES.AdminUserController);

// All admin routes require authentication AND admin role
router.use(authMiddleware);
router.use(requirePermission(ACTIONS.MANAGE, RESOURCES.ALL));

// Apply base admin rate limiting to all admin routes
router.use(adminLimiter);

// ===== STATS ENDPOINTS (READ-ONLY) =====
/**
 * GET /api/<version>/stats/summary
 * Dashboard summary statistics
 */
router.get(
  '/stats/summary',
  readLimiter,
  validateQuery(adminStatsQuerySchema),
  expressRouteWrapper(statsController.getSummary.bind(statsController))
);

/**
 * GET /api/<version>/stats/users
 * Detailed user statistics
 */
router.get(
  '/stats/users',
  readLimiter,
  validateQuery(adminStatsQuerySchema),
  expressRouteWrapper(statsController.getUserStats.bind(statsController))
);

/**
 * GET /api/<version>/stats/books
 * Detailed book statistics
 */
router.get(
  '/stats/books',
  readLimiter,
  validateQuery(adminStatsQuerySchema),
  expressRouteWrapper(statsController.getBookStats.bind(statsController))
);

// ===== USER MANAGEMENT ENDPOINTS =====
/**
 * GET /api/<version>/users
 * Get all users with pagination and search
 */
router.get(
  '/users',
  validateQuery(adminGetUsersQuerySchema),
  expressRouteWrapper(adminUserController.getAllUsers.bind(adminUserController))
);

/**
 * GET /api/<version>/users/:id
 * Get single user by ID
 */
router.get(
  '/users/:id',
  validateQuery(adminStatsQuerySchema),
  expressRouteWrapper(adminUserController.getUserById.bind(adminUserController))
);

/**
 * PUT /api/<version>/users/:id
 * Update user details by ID
 */
router.put(
  '/users/:id',
  writeLimiter,
  validateParams(adminIdParamSchema),
  validateBody(adminUpdateUserSchema),
  expressRouteWrapper(adminUserController.updateUser.bind(adminUserController))
);

/**
 * DELETE /api/<version>/users/:id
 * Delete a user by ID
 */
router.delete(
  '/users/:id',
  writeLimiter,
  validateParams(adminIdParamSchema),
  expressRouteWrapper(adminUserController.deleteUser.bind(adminUserController))
);

// ===== BOOK MANAGEMENT ENDPOINTS =====
/**
 * GET /api/<version>/books
 * Get all books with pagination and search
 */
router.get(
  '/books',
  readLimiter,
  validateQuery(adminGetBooksQuerySchema),
  expressRouteWrapper(adminBookController.getAllBooks.bind(adminBookController))
);

/**
 * GET /api/<version>/books/:id
 * Get single book by ID
 */
router.get(
  '/books/:id',
  readLimiter,
  validateParams(adminIdParamSchema),
  expressRouteWrapper(adminBookController.getBookById.bind(adminBookController))
);

/**
 * PUT /api/<version>/books/:id
 * Update book details by ID
 */
router.put(
  '/books/:id',
  writeLimiter,
  validateParams(adminIdParamSchema),
  validateBody(adminUpdateBookSchema),
  expressRouteWrapper(adminBookController.updateBook.bind(adminBookController))
);

/**
 * DELETE /api/<version>/books/:id
 * Delete a book by ID
 */
router.delete(
  '/books/:id',
  writeLimiter,
  validateParams(adminIdParamSchema),
  expressRouteWrapper(adminBookController.deleteBook.bind(adminBookController))
);

// ===== SETTINGS ENDPOINTS =====
/**
 * GET /api/<version>/settings/audit-logging
 * Get audit logging status
 */
router.get(
  '/settings/audit-logging',
  readLimiter,
  expressRouteWrapper(adminSettingsController.getAuditLoggingStatus.bind(adminSettingsController))
);

/**
 * PATCH /api/<version>/settings/audit-logging
 * Update audit logging status
 */
router.patch(
  '/settings/audit-logging',
  writeLimiter,
  expressRouteWrapper(
    adminSettingsController.updateAuditLoggingStatus.bind(adminSettingsController)
  )
);

/**
 * GET /api/<version>/settings/search/status
 * Get search settings status
 */
router.get(
  '/settings/search/status',
  readLimiter,
  expressRouteWrapper(adminSettingsController.getSearchStatus.bind(adminSettingsController))
);

/**
 * PATCH /api/<version>/settings/search
 * Update search settings
 */
router.patch(
  '/settings/search',
  writeLimiter,
  expressRouteWrapper(adminSettingsController.updateSearchSettings.bind(adminSettingsController))
);

// ===== MOBILE APP SETTINGS ENDPOINTS =====

/**
 * GET /api/<version>/mobile-app/settings
 * Get mobile app settings
 */
router.get(
  '/mobile-app/settings',
  expressRouteWrapper(adminMobileAppSettingsController.getSettings.bind(adminMobileAppSettingsController))
);

/**
 * PUT /api/<version>/mobile-app/settings
 * Update mobile app settings
 */
router.put(
  '/mobile-app/settings',
  writeLimiter,
  validateBody(adminUpdateMobileAppSettingsSchema),
  expressRouteWrapper(adminMobileAppSettingsController.updateSettings.bind(adminMobileAppSettingsController))
);

/**
 * POST /api/<version>/mobile-app/settings
 * Reset mobile app settings to default
 */
router.post(
  '/mobile-app/settings/reset',
  writeLimiter,
  expressRouteWrapper(adminMobileAppSettingsController.resetSettings.bind(adminMobileAppSettingsController))
);

/**
 * GET /api/<version>/admin/mobile-app/settings/schema
 * Get mobile app settings validation schema
 */
router.get(
  '/mobile-app/settings/schema',
  expressRouteWrapper(adminMobileAppSettingsController.getMobileSettingsSchema.bind(adminMobileAppSettingsController))
);

export default router;
