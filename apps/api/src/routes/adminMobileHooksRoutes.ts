// ================================================================
// src/routes/adminMobileHooksRoutes.ts
// Routes for mobile hook configuration endpoints
// ================================================================

import express, { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { adminMobileHooksSettingsController } from '../controllers/admin/AdminMobileHooksSettingsController';
import { adminMobileHooksActionsConfigController } from '../controllers/admin/AdminMobileHooksActionsConfigController';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { ACTIONS, RESOURCES } from '@my-many-books/shared-auth';
import { adminMobileHooksAnalyticsController } from '@/controllers/admin/AdminMobileHooksAnalyticsController';

const router: express.Router = Router();

// All admin routes require authentication AND admin role
router.use(authMiddleware);
router.use(requirePermission(ACTIONS.MANAGE, RESOURCES.ALL));

// ================================================================
// Admin Mobile Hooks Settings Routes (AdminMobileHooksSettingsController)
// ================================================================

/**
 * GET /api/<version>/admin/mobile-hooks/settings/listeners
 * Get listener feature flags (analyticsEnabled, errorReportingEnabled, etc.)
 */
router.get(
  '/settings/listeners',
  expressRouteWrapper(
    adminMobileHooksSettingsController.getListenerSettings.bind(adminMobileHooksSettingsController)
  )
);

/**
 * PUT /api/<version>/admin/mobile-hooks/settings/listeners
 * Update listener feature flags
 */
router.put(
  '/settings/listeners',
  expressRouteWrapper(
    adminMobileHooksSettingsController.updateListenerSettings.bind(adminMobileHooksSettingsController)
  )
);

/**
 * GET /api/<version>/admin/mobile-hooks/settings/schema
 * Get mobile hooks settings validation schema
 */
router.get(
  '/settings/schema',
  expressRouteWrapper(adminMobileHooksSettingsController.getMobileSettingsSchema.bind(adminMobileHooksSettingsController))
);

// ================================================================
// Admin Mobile Hooks Actions Config Routes (AdminMobileHooksActionsConfigController)
// ================================================================

/**
 * GET /api/<version>/admin/mobile-hooks/config/listeners
 * Get hook listener status
 */
router.get(
  '/config/listeners',
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.getHookListeners.bind(adminMobileHooksActionsConfigController)
  )
);

/**
 * PUT /api/<version>/admin/mobile-hooks/config/listeners
 * Enable/disable specific listeners (events) + categories
 */
router.put(
  '/config/listeners',
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.updateHookActionListeners.bind(adminMobileHooksActionsConfigController)
  )
);

// Emergency Controls via adminMobileHooksSettingsController

/**
 * GET /api/<version>/admin/mobile-hooks/emergency
 * Get emergency status
 */
router.get(
  '/emergency',
  expressRouteWrapper(
    adminMobileHooksSettingsController.getEmergencyStatus.bind(adminMobileHooksSettingsController)
  )
);

/**
 * PUT /api/<version>/admin/mobile-hooks/emergency
 * Emergency enable/disable all mobile hooks
 */
router.put(
  '/emergency',
  expressRouteWrapper(
    adminMobileHooksSettingsController.updateEmergencyStatus.bind(adminMobileHooksSettingsController)
  )
);

/**
 * GET /api/<version>/admin/mobile-hooks/health
 * Hook system health check
 */
router.get(
  '/health',
  expressRouteWrapper(
    adminMobileHooksSettingsController.getHealth.bind(adminMobileHooksSettingsController)
  )
);

/**
 * GET /api/<version>/admin/mobile-hooks/analytics/events/recent
 * Recent events (polling-friendly "real-time" monitoring)
 */
router.get(
  '/analytics/events/recent',
  expressRouteWrapper(
    adminMobileHooksAnalyticsController.getRecentEvents.bind(adminMobileHooksAnalyticsController)
  )
);

/**
 * GET /api/<version>/admin/mobile-hooks/analytics/stats
 * Action stats (success rate, error rate, etc.)
 */
router.get(
  '/analytics/stats',
  expressRouteWrapper(
    adminMobileHooksAnalyticsController.getActionStats.bind(adminMobileHooksAnalyticsController)
  )
);

/**
 * GET /api/<version>/admin/mobile-hooks/actions-config/mappings
 * Get action mappings (event → actions)
 */
router.get(
  '/actions-config/mappings',
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.getActionMappings.bind(adminMobileHooksActionsConfigController)
  )
);

/**
 * PUT /api/<version>/admin/mobile-hooks/actions-config/mappings
 * Update action mappings
 */
router.put(
  '/actions-config/mappings',
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.updateActionMappings.bind(adminMobileHooksActionsConfigController)
  )
);

/**
 * GET /api/<version>/admin/mobile-hooks/actions-config/types
 * Get available action types with warnings
 */
router.get(
  '/actions-config/types',
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.getActionTypes.bind(adminMobileHooksActionsConfigController)
  )
);

/**
 * PUT /api/<version>/admin/mobile-hooks/actions-config/types/:action_type
 * Update settings for specific action type
 */
router.put(
  '/actions-config/types/:action_type',
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.updateActionTypeSettings.bind(adminMobileHooksActionsConfigController)
  )
);

/**
 * POST /api/<version>/admin/mobile-hooks/actions-config/types/:action_type/test
 * Test specific action type (e.g., test email sending)
 */
router.post(
  '/actions-config/types/:action_type/test',
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.testActionType.bind(adminMobileHooksActionsConfigController)
  )
);

/**
 * POST /api/<version>/admin/mobile-hooks/actions-config/test
 * Test full config flow (event → action mappings)
 */
router.post(
  '/actions-config/test',
  expressRouteWrapper(
    adminMobileHooksActionsConfigController.testConfig.bind(adminMobileHooksActionsConfigController)
  )
);

export default router;
