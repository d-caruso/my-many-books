// ================================================================
// src/routes/isbnRoutes.ts
// ISBN service routes for book lookup and validation
// ================================================================

import { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { IsbnController } from '../controllers/IsbnController';

const router = Router();
const isbnController = new IsbnController();

// Public ISBN service routes (no authentication required for lookups)
// These routes allow external systems and apps to validate and lookup ISBNs

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

// Service health check
router.get('/health', expressRouteWrapper(isbnController.getServiceHealth.bind(isbnController)));

// Resilience statistics (circuit breaker, cache, etc.)
router.get('/stats', expressRouteWrapper(isbnController.getResilienceStats.bind(isbnController)));

// Cache management
router.get('/cache', expressRouteWrapper(isbnController.getCacheStats.bind(isbnController)));
router.delete('/cache', expressRouteWrapper(isbnController.clearCache.bind(isbnController)));

// Resilience management
router.delete('/resilience', expressRouteWrapper(isbnController.resetResilience.bind(isbnController)));

// Fallback book management
router.post('/fallback', expressRouteWrapper(isbnController.addFallbackBook.bind(isbnController)));

export default router;
