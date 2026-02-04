/**
 * src/routes/adminMobileAnalyticsRoutes.ts
 * Routes for admin-only mobile analytics endpoints
 */

import express, { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { adminMobileAnalyticsController } from '../controllers/admin/AdminMobileAnalyticsController';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { ACTIONS, RESOURCES } from '@my-many-books/shared-auth';
import { adminLimiter } from '../middleware/rateLimiters';

const router: express.Router = Router();

router.use(authMiddleware);
router.use(requirePermission(ACTIONS.MANAGE, RESOURCES.ALL));
router.use(adminLimiter);

/**
 * GET /api/<version>/admin/mobile-analytics/stats
 * Event statistics
 */
router.get(
    '/stats',
    expressRouteWrapper(adminMobileAnalyticsController.getStats.bind(adminMobileAnalyticsController))
);

/**
 * GET /api/<version>/admin/mobile-analytics/health
 * Analytics system health check
 */
router.get(
    '/health',
    expressRouteWrapper(adminMobileAnalyticsController.getHealth.bind(adminMobileAnalyticsController))
);

export default router;