// ================================================================
// src/routes/mobileAppRoutes.ts
// Routes for mobile hook configuration endpoints
// ================================================================

import express, { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { mobileConfigController } from '../controllers/mobile/MobileConfigController';
import { emergencyController } from '../controllers/mobile/EmergencyController';
import { authMiddleware } from '../middleware/auth';
import {
  validateBody,
  emergencyConfigSchema,
} from '../validation';

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
  validateBody(emergencyConfigSchema),
  expressRouteWrapper(emergencyController.updateEmergencyConfig.bind(emergencyController))
);

export default router;
