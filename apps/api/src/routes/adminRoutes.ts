// ================================================================
// src/routes/adminRoutes.ts
// Admin-only routes - all require authentication + admin role
// ================================================================

import { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { StatsController } from '../controllers/admin/StatsController';
import { AdminUserController } from '../controllers/admin/AdminUserController';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();
const statsController = new StatsController();
const adminUserController = new AdminUserController();

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
// Get all users with pagination and search
router.get('/users',
  expressRouteWrapper(adminUserController.getAllUsers.bind(adminUserController))
);

// Get single user by ID
router.get('/users/:id',
  expressRouteWrapper(adminUserController.getUserById.bind(adminUserController))
);

// Update user details
router.put('/users/:id',
  expressRouteWrapper(adminUserController.updateUser.bind(adminUserController))
);

// Delete user
router.delete('/users/:id',
  expressRouteWrapper(adminUserController.deleteUser.bind(adminUserController))
);

// ===== BOOK MANAGEMENT ENDPOINTS (Phase 4) =====
// TODO: Add book management routes
// router.get('/books', ...)
// router.get('/books/:id', ...)
// router.put('/books/:id', ...)
// router.delete('/books/:id', ...)

export default router;
