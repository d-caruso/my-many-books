// ================================================================
// src/routes/adminRoutes.ts
// Admin-only routes - all require authentication + admin role
// ================================================================

import { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { StatsController } from '../controllers/admin/StatsController';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();
const statsController = new StatsController();

// All admin routes require authentication AND admin role
router.use(authMiddleware);
router.use(requireAdmin);

// ===== STATS ENDPOINTS =====
// Dashboard summary statistics
router.get('/stats/summary',
  expressRouteWrapper(statsController.getSummary.bind(statsController))
);

// Detailed user statistics (future)
router.get('/stats/users',
  expressRouteWrapper(statsController.getUserStats.bind(statsController))
);

// Detailed book statistics (future)
router.get('/stats/books',
  expressRouteWrapper(statsController.getBookStats.bind(statsController))
);

// ===== USER MANAGEMENT ENDPOINTS (Phase 3) =====
// TODO: Add user management routes
// router.get('/users', ...)
// router.get('/users/:id', ...)
// router.put('/users/:id', ...)
// router.delete('/users/:id', ...)

// ===== BOOK MANAGEMENT ENDPOINTS (Phase 4) =====
// TODO: Add book management routes
// router.get('/books', ...)
// router.get('/books/:id', ...)
// router.put('/books/:id', ...)
// router.delete('/books/:id', ...)

export default router;
