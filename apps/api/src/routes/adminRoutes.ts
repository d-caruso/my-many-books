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
import { adminMobileHooksActionsConfigController } from '../controllers/admin/AdminMobileHooksActionsConfigController';
import { adminMobileHooksSettingsController } from '../controllers/admin/AdminMobileHooksSettingsController';
import { adminMobileHooksAnalyticsController } from '../controllers/admin/AdminMobileHooksAnalyticsController';
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

const router: express.Router = Router();
const adminUserController = container.get<AdminUserController>(TYPES.AdminUserController);

// All admin routes require authentication AND admin role
router.use(authMiddleware);
router.use(requirePermission(ACTIONS.MANAGE, RESOURCES.ALL));

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

// ===== SETTINGS ENDPOINTS =====
// Get audit logging status (READ)
router.get(
  '/settings/audit-logging',
  readLimiter,
  expressRouteWrapper(adminSettingsController.getAuditLoggingStatus.bind(adminSettingsController))
);

// Update audit logging status (WRITE)
router.patch(
  '/settings/audit-logging',
  writeLimiter,
  expressRouteWrapper(
    adminSettingsController.updateAuditLoggingStatus.bind(adminSettingsController)
  )
);

// Get search settings status (READ)
router.get(
  '/settings/search/status',
  readLimiter,
  expressRouteWrapper(adminSettingsController.getSearchStatus.bind(adminSettingsController))
);

// Update search settings (WRITE)
router.patch(
  '/settings/search',
  writeLimiter,
  expressRouteWrapper(adminSettingsController.updateSearchSettings.bind(adminSettingsController))
);

// ===== MOBILE ADMIN ENDPOINTS =====

// Mobile Hook Management

// Get current mobile hook listeners settings
router.get(
  '/mobile-hooks/settings/listeners',
  authMiddleware,
  expressRouteWrapper(
    adminMobileHooksSettingsController.getListenerSettings.bind(adminMobileHooksSettingsController)
  )
);

// Update mobile hook listeners settings
router.put(
  '/mobile-hooks/settings/listeners',
  authMiddleware,
  expressRouteWrapper(
    adminMobileHooksSettingsController.updateListenerSettings.bind(adminMobileHooksSettingsController)
  )
);

// Get hook listener status
router.get(
  '/mobile-hooks/config/listeners',
  authMiddleware,
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.getHookListeners.bind(adminMobileHooksActionsConfigController)
  )
);

// Enable/disable specific listeners (events) + categories
router.put(
  '/mobile-hooks/config/listeners',
  authMiddleware,
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.updateHookActionListeners.bind(adminMobileHooksActionsConfigController)
  )
);

// Test hook configuration
router.post(
  '/mobile-hooks/actions-config/test',
  authMiddleware,
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.testConfig.bind(adminMobileHooksActionsConfigController)
  )
);

// Hook Action Management

// Get action configurations
router.get(
  '/mobile-hooks/actions-config/types',
  authMiddleware,
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.getActionTypes.bind(adminMobileHooksActionsConfigController)
  )
);

// Update action configurations
router.put(
  '/mobile-hooks/actions-config/types/:action_type',
  authMiddleware,
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.updateActionTypeSettings.bind(adminMobileHooksActionsConfigController)
  )
);

// Test action execution TO DO
router.post(
  '/mobile-hooks/actions-config/types/:action_type/test',
  authMiddleware,
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.testActionType.bind(adminMobileHooksActionsConfigController)
  )
);

// Emergency Controls via adminMobileHooksSettingsController

// Get emergency status
router.get(
  '/mobile-hooks/emergency',
  adminMobileHooksSettingsController.getEmergencyStatus.bind(adminMobileHooksSettingsController)
);

// Emergency enable/disable all mobile hooks
router.put(
  '/mobile-hooks/emergency',
  adminMobileHooksSettingsController.updateEmergencyStatus.bind(adminMobileHooksSettingsController)
);

// Hook system health check
router.get(
  '/mobile-hooks/health',
  adminMobileHooksSettingsController.getHealth.bind(adminMobileHooksSettingsController)
);

// Recent events (polling-friendly "real-time" monitoring)
router.get(
  '/mobile-hooks/analytics/events/recent',
  readLimiter,
  expressRouteWrapper(
    adminMobileHooksAnalyticsController.getRecentEvents.bind(adminMobileHooksAnalyticsController)
  )
);

export default router;
