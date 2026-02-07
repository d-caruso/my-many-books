// ================================================================
// src/routes/isbnRoutes.ts
// ISBN service routes for book lookup and validation
// ================================================================

import express, { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { IsbnController } from '../controllers/IsbnController';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

const router: express.Router = Router();
const isbnController = new IsbnController();

// All ISBN routes require authentication
router.use(authMiddleware);

// ================================================================
// User-accessible routes (authenticated users)
// ================================================================

// ISBN lookup endpoint - GET with query param or path param
router.get('/lookup', expressRouteWrapper(isbnController.lookupBook.bind(isbnController)));

// Batch ISBN lookup - POST with array of ISBNs
router.post('/lookup', expressRouteWrapper(isbnController.batchLookupBooks.bind(isbnController)));

// Search books by title
router.get('/search', expressRouteWrapper(isbnController.searchByTitle.bind(isbnController)));

// ISBN validation endpoint
router.get('/validate', expressRouteWrapper(isbnController.validateIsbn.bind(isbnController)));

// ISBN formatting endpoint
router.get('/format', expressRouteWrapper(isbnController.formatIsbn.bind(isbnController)));

// ================================================================
// Admin-only routes
// ================================================================

// Service health check
router.get('/health', requireAdmin, expressRouteWrapper(isbnController.getServiceHealth.bind(isbnController)));

// Resilience statistics (circuit breaker, cache, etc.)
router.get('/stats', requireAdmin, expressRouteWrapper(isbnController.getResilienceStats.bind(isbnController)));

// Cache management
router.get('/cache', requireAdmin, expressRouteWrapper(isbnController.getCacheStats.bind(isbnController)));
router.delete('/cache', requireAdmin, expressRouteWrapper(isbnController.clearCache.bind(isbnController)));

// Resilience management
router.delete(
  '/resilience',
  requireAdmin,
  expressRouteWrapper(isbnController.resetResilience.bind(isbnController))
);

// Fallback book management
router.post('/fallback', requireAdmin, expressRouteWrapper(isbnController.addFallbackBook.bind(isbnController)));

export default router;
