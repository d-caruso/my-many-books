// ================================================================
// src/routes/mobileConfigRoutes.ts
// Routes for mobile hook configuration endpoints
// ================================================================

import { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { mobileConfigController } from '../controllers/mobile/MobileConfigController';
import { emergencyController } from '../controllers/mobile/EmergencyController';
import { adminMobileHooksController } from '../controllers/admin/AdminMobileHooksController';
import { userMobileConfigController } from '../controllers/mobile/UserMobileConfigController';

const router = Router();

// ================================================================
// Mobile Hook Configuration Routes (Public API)
// ================================================================

/**
 * GET /api/config/mobile
 * Get mobile hook settings
 */
router.get('/config/mobile', expressRouteWrapper(mobileConfigController.getMobileConfig.bind(mobileConfigController)));

/**
 * PUT /api/config/mobile
 * Update mobile hook settings
 */
router.put('/config/mobile', expressRouteWrapper(mobileConfigController.updateMobileConfig.bind(mobileConfigController)));

// ================================================================
// Emergency Kill Switch Routes
// ================================================================

/**
 * GET /api/config/emergency
 * Get emergency kill switches
 */
router.get('/config/emergency', expressRouteWrapper(emergencyController.getEmergencyConfig.bind(emergencyController)));

/**
 * PUT /api/config/emergency
 * Update emergency settings
 */
router.put('/config/emergency', expressRouteWrapper(emergencyController.updateEmergencyConfig.bind(emergencyController)));

// ================================================================
// Admin Hook Action Configuration Routes
// ================================================================

/**
 * GET /api/admin/mobile-hooks/config
 * Get hook action mappings
 */
router.get('/admin/mobile-hooks/config', expressRouteWrapper(adminMobileHooksController.getHookActionConfig.bind(adminMobileHooksController)));

/**
 * PUT /api/admin/mobile-hooks/config
 * Update hook action mappings
 */
router.put('/admin/mobile-hooks/config', expressRouteWrapper(adminMobileHooksController.updateHookActionConfig.bind(adminMobileHooksController)));

/**
 * GET /api/admin/mobile-hooks/actions
 * Get available action types
 */
router.get('/admin/mobile-hooks/actions', expressRouteWrapper(adminMobileHooksController.getAvailableActions.bind(adminMobileHooksController)));

/**
 * PUT /api/admin/mobile-hooks/actions/:action_type
 * Update action settings for specific action type
 */
router.put('/admin/mobile-hooks/actions/:action_type', expressRouteWrapper(adminMobileHooksController.updateActionSettings.bind(adminMobileHooksController)));

// ================================================================
// User-specific Mobile Configuration Routes
// ================================================================

/**
 * GET /api/users/:id/mobile-config
 * Get user's mobile hook config
 */
router.get('/users/:id/mobile-config', expressRouteWrapper(userMobileConfigController.getUserMobileConfig.bind(userMobileConfigController)));

/**
 * PUT /api/users/:id/mobile-config
 * Update user's mobile hook config
 */
router.put('/users/:id/mobile-config', expressRouteWrapper(userMobileConfigController.updateUserMobileConfig.bind(userMobileConfigController)));

export default router;