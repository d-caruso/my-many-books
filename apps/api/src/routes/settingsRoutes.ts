// ================================================================
// src/routes/settingsRoutes.ts
// Settings routes - public and admin endpoints
// ================================================================

import { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { SettingsController } from '../controllers/SettingsController';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { ACTIONS, RESOURCES } from '@my-many-books/shared-auth';
import {
  validateParams,
  validateBody,
} from '../validation';
import {
  settingKeyParamSchema,
  updateSettingBodySchema,
  toggleActiveBodySchema,
} from '../validation/schemas/settings.schema';
import { readLimiter, writeLimiter } from '../middleware/rateLimiters';
import { container } from '../container';
import { TYPES } from '../container/types';

const router = Router();
const settingsController = container.get<SettingsController>(TYPES.SettingsController);

// ===== PUBLIC ENDPOINTS (NO AUTH) =====
// Get all active settings
router.get(
  '/',
  readLimiter,
  expressRouteWrapper(settingsController.getAllSettings.bind(settingsController))
);

// Get specific setting by key
router.get(
  '/:key',
  readLimiter,
  validateParams(settingKeyParamSchema),
  expressRouteWrapper(settingsController.getSetting.bind(settingsController))
);

// ===== ADMIN ENDPOINTS (REQUIRE AUTH + ADMIN PERMISSION) =====
// Get all settings including deleted (admin only)
router.get(
  '/admin',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.SETTINGS),
  readLimiter,
  expressRouteWrapper(settingsController.getAllSettingsAdmin.bind(settingsController))
);

// Update setting value (admin only)
router.patch(
  '/admin/:key',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.SETTINGS),
  writeLimiter,
  validateParams(settingKeyParamSchema),
  validateBody(updateSettingBodySchema),
  expressRouteWrapper(settingsController.updateSetting.bind(settingsController))
);

// Toggle setting active status (admin only)
router.patch(
  '/admin/:key/toggle',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.SETTINGS),
  writeLimiter,
  validateParams(settingKeyParamSchema),
  validateBody(toggleActiveBodySchema),
  expressRouteWrapper(settingsController.toggleActive.bind(settingsController))
);

export default router;
