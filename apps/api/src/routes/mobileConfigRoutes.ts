// ================================================================
// src/routes/mobileConfigRoutes.ts
// Routes for mobile hook configuration endpoints
// ================================================================

import express, { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { mobileConfigController } from '../controllers/mobile/MobileConfigController';
import { emergencyController } from '../controllers/mobile/EmergencyController';
import { adminMobileHooksSettingsController } from '../controllers/admin/AdminMobileHooksSettingsController';
import { adminMobileHooksActionsConfigController } from '../controllers/admin/AdminMobileHooksActionsConfigController';
import { userMobileConfigController } from '../controllers/mobile/UserMobileConfigController';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { ACTIONS, RESOURCES } from '@my-many-books/shared-auth';

const router: express.Router = Router();

// ================================================================
// Mobile Hook Configuration Routes (Public API - Mobile App)
// ================================================================

/**
 * GET /api/config/mobile
 * Mobile app fetches its configuration (read-only)
 */
router.get(
  '/config/mobile',
  expressRouteWrapper(mobileConfigController.getMobileConfig.bind(mobileConfigController))
);

// ================================================================
// Emergency Kill Switch Routes
// ================================================================

/**
 * GET /api/config/emergency
 * Get emergency kill switch status
 */
router.get(
  '/config/emergency',
  authMiddleware,
  expressRouteWrapper(emergencyController.getEmergencyConfig.bind(emergencyController))
);

/**
 * PUT /api/config/emergency
 * Update emergency kill switch
 */
router.put(
  '/config/emergency',
  authMiddleware,
  expressRouteWrapper(emergencyController.updateEmergencyConfig.bind(emergencyController))
);

// ================================================================
// Admin Mobile Hooks Settings Routes (AdminMobileHooksSettingsController)
// ================================================================

/**
 * GET /api/admin/mobile-hooks/settings/listeners
 * Get listener feature flags (analyticsEnabled, errorReportingEnabled, etc.)
 */
router.get(
  '/admin/mobile-hooks/settings/listeners',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
  expressRouteWrapper(
    adminMobileHooksSettingsController.getListenerSettings.bind(adminMobileHooksSettingsController)
  )
);

/**
 * PUT /api/admin/mobile-hooks/settings/listeners
 * Update listener feature flags
 */
router.put(
  '/admin/mobile-hooks/settings/listeners',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
  expressRouteWrapper(
    adminMobileHooksSettingsController.updateListenerSettings.bind(adminMobileHooksSettingsController)
  )
);

// ================================================================
// Admin Mobile Hooks Actions Config Routes (AdminMobileHooksActionsConfigController)
// ================================================================

/**
 * GET /api/admin/mobile-hooks/actions-config/mappings
 * Get action mappings (event → actions)
 */
router.get(
  '/admin/mobile-hooks/actions-config/mappings',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.getActionMappings.bind(adminMobileHooksActionsConfigController)
  )
);

/**
 * PUT /api/admin/mobile-hooks/actions-config/mappings
 * Update action mappings
 */
router.put(
  '/admin/mobile-hooks/actions-config/mappings',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.updateActionMappings.bind(adminMobileHooksActionsConfigController)
  )
);

/**
 * GET /api/admin/mobile-hooks/actions-config/types
 * Get available action types with warnings
 */
router.get(
  '/admin/mobile-hooks/actions-config/types',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.getActionTypes.bind(adminMobileHooksActionsConfigController)
  )
);

/**
 * PUT /api/admin/mobile-hooks/actions-config/types/:action_type
 * Update settings for specific action type
 */
router.put(
  '/admin/mobile-hooks/actions-config/types/:action_type',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.updateActionTypeSettings.bind(adminMobileHooksActionsConfigController)
  )
);

/**
 * POST /api/admin/mobile-hooks/actions-config/types/:action_type/test
 * Test specific action type (e.g., test email sending)
 */
router.post(
  '/admin/mobile-hooks/actions-config/types/:action_type/test',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.testActionType.bind(adminMobileHooksActionsConfigController)
  )
);

/**
 * POST /api/admin/mobile-hooks/actions-config/test
 * Test full config flow (event → action mappings)
 */
router.post(
  '/admin/mobile-hooks/actions-config/test',
  authMiddleware,
  requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.testConfig.bind(adminMobileHooksActionsConfigController)
  )
);

// ================================================================
// User-specific Mobile Configuration Routes
// ================================================================

/**
 * GET /api/users/:id/mobile-config
 * Get user's mobile preferences (notifications, privacy)
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
 * Update user's mobile preferences
 */
router.put(
  '/users/:id/mobile-config',
  authMiddleware,
  expressRouteWrapper(
    userMobileConfigController.updateUserMobileConfig.bind(userMobileConfigController)
  )
);

export default router;
