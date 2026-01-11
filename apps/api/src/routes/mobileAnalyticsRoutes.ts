// ================================================================
// src/routes/mobileAnalyticsRoutes.ts
// Routes for mobile analytics API endpoints
// ================================================================

import express, { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { mobileAnalyticsController } from '../controllers/mobile/MobileAnalyticsController';

const router: express.Router = Router();

// ================================================================
// Mobile Analytics Event Ingestion Routes
// ================================================================

/**
 * POST /api/mobile-analytics/events
 * Single event upload
 */
router.post('/events', expressRouteWrapper(mobileAnalyticsController.uploadEvent.bind(mobileAnalyticsController)));

/**
 * POST /api/mobile-analytics/events/batch
 * Batch event upload
 */
router.post('/events/batch', expressRouteWrapper(mobileAnalyticsController.uploadEventBatch.bind(mobileAnalyticsController)));

/**
 * GET /api/mobile-analytics/stats
 * Event statistics
 */
router.get('/stats', expressRouteWrapper(mobileAnalyticsController.getStats.bind(mobileAnalyticsController)));

/**
 * GET /api/mobile-analytics/health
 * Analytics system health check
 */
router.get('/health', expressRouteWrapper(mobileAnalyticsController.getHealth.bind(mobileAnalyticsController)));

export default router;