// ================================================================
// src/routes/adminMobileAppRoutes.ts
// Admin-only mobile routes - all require authentication + admin role
// ================================================================

import express, { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { adminMobileAppSettingsController } from '../controllers/admin/AdminMobileAppSettingsController';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { ACTIONS, RESOURCES } from '@my-many-books/shared-auth';
import {
  validateBody,
} from '../validation';
import { adminLimiter, writeLimiter } from '../middleware/rateLimiters';
import { adminUpdateMobileAppSettingsSchema } from '@/validation/schemas/admin.schema';

const router: express.Router = Router();

// All admin routes require authentication AND admin role
router.use(authMiddleware);
router.use(requirePermission(ACTIONS.MANAGE, RESOURCES.ALL));

// Apply base admin rate limiting to all admin routes
router.use(adminLimiter);

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