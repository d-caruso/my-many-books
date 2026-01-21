// ================================================================
// src/routes/mobileConfigRoutes.ts
// Routes for mobile hook configuration endpoints
// ================================================================

import express, { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { mobileConfigController } from '../controllers/mobile/MobileConfigController';
import { emergencyController } from '../controllers/mobile/EmergencyController';
import { adminMobileHooksActionsConfigController } from '../controllers/admin/AdminMobileHooksActionsConfigController';
import { userMobileConfigController } from '../controllers/mobile/UserMobileConfigController';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { ACTIONS, RESOURCES } from '@my-many-books/shared-auth';

const router: express.Router = Router();

// ================================================================
// Mobile Hook Configuration Routes (Public API)
// ================================================================

/**
 * GET /api/config/mobile
 * Get mobile hook settings
 */
router.get(
  '/config/mobile',
  expressRouteWrapper(mobileConfigController.getListenerSettings.bind(mobileConfigController))
);

// ================================================================
// Emergency Kill Switch Routes
// ================================================================

/**
 * GET /api/config/emergency
 * Get emergency kill switches
 */
router.get(
  '/config/emergency',
  authMiddleware,
  expressRouteWrapper(emergencyController.getEmergencyConfig.bind(emergencyController))
);

/**
 * PUT /api/config/emergency
 * Update emergency settings
 */
router.put(
  '/config/emergency',
  authMiddleware,
  expressRouteWrapper(emergencyController.updateEmergencyConfig.bind(emergencyController))
);

// ================================================================
// Admin Hook Action Configuration Routes
// ================================================================

/**
 * GET /api/admin/mobile-hooks/settings/listeners
 * Get hook action mappings
 */
router.get(
  '/admin/mobile-hooks/settings/listeners',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.getHookActionConfig.bind(adminMobileHooksActionsConfigController)
  )
);

/**
 * PUT /api/admin/mobile-hooks/settings/listeners
 * Update hook action mappings
 */
router.put(
  '/admin/mobile-hooks/settings/listeners',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.updateHookActionConfig.bind(adminMobileHooksActionsConfigController)
  )
);

/**
 * GET /api/admin/mobile-hooks/actions
 * Get available action types
 */
router.get(
  '/admin/mobile-hooks/actions',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.getAvailableActions.bind(adminMobileHooksActionsConfigController)
  )
);

/**
 * PUT /api/admin/mobile-hooks/actions/:action_type
 * Update action settings for specific action type
 */
router.put(
  '/admin/mobile-hooks/actions/:action_type',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.updateActionSettings.bind(adminMobileHooksActionsConfigController)
  )
);

// ================================================================
// User-specific Mobile Configuration Routes
// ================================================================

/**
 * GET /api/users/:id/mobile-config
 * Get user's mobile hook config
 */
router.get(
  '/users/:id/mobile-config',
  authMiddleware,
  expressRouteWrapper(
    userMobileConfigController.getUserMobileConfig.bind(userMobileConfigController)
  )
);

/**
 * PUT /api/users/:id/mobile-config
 * Update user's mobile hook config
 */
router.put(
  '/users/:id/mobile-config',
  authMiddleware,
  expressRouteWrapper(
    userMobileConfigController.updateUserMobileConfig.bind(userMobileConfigController)
  )
);

export default router;
