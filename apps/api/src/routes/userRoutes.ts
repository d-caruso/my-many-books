// ================================================================
// src/routes/userRoutes.ts
// User management routes
// ================================================================

import express, { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { readLimiter, writeLimiter } from '../middleware/rateLimiters';
import {
  validateBody,
  validateQuery,
  updateUserSchema,
  getUserBooksQuerySchema,
} from '../validation';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { container } from '../container';
import { TYPES } from '../container/types';
import { UserController } from '../controllers/UserController';
import { userMobileHooksSettingsController } from '../controllers/mobile/UserMobileHooksSettingsController';
import { userMobileConfigController } from '../controllers/mobile/UserMobileConfigController';

const router: express.Router = Router();
const userController = container.get<UserController>(TYPES.UserController);

// All user routes require authentication
router.use(authMiddleware);

// User profile endpoints (without "profile" in URI)
// Apply granular rate limiting: separate limits for read vs write operations
router.get(
  '/:id',
  readLimiter,
  expressRouteWrapper(userController.getCurrentUser.bind(userController))
); // GET user info
router.put(
  '/:id',
  writeLimiter,
  validateBody(updateUserSchema),
  expressRouteWrapper(userController.updateCurrentUser.bind(userController))
); // PUT to update user info
router.delete(
  '/:id',
  writeLimiter,
  expressRouteWrapper(userController.deleteAccount.bind(userController))
); // DELETE account

// User books endpoints (READ)
router.get(
  '/:id/books',
  readLimiter,
  validateQuery(getUserBooksQuerySchema),
  expressRouteWrapper(userController.getUserBooks.bind(userController))
);

// User statistics (READ)
router.get(
  '/:id/stats',
  readLimiter,
  expressRouteWrapper(userController.getUserStats.bind(userController))
);

// Account deactivation (WRITE)
router.patch(
  '/:id',
  writeLimiter,
  expressRouteWrapper(userController.deactivateAccount.bind(userController))
); // PATCH to deactivate account

// User mobile hooks settings (READ)
router.get(
  '/:id/mobile-hooks/settings',
  readLimiter,
  expressRouteWrapper(userMobileHooksSettingsController.getSettings.bind(userMobileHooksSettingsController))
);

// User mobile hooks settings (WRITE)
router.put(
  '/:id/mobile-hooks/settings',
  writeLimiter,
  expressRouteWrapper(userMobileHooksSettingsController.updateSettings.bind(userMobileHooksSettingsController))
);


// ================================================================
// User-specific Mobile Configuration Routes
// ================================================================

/**
 * GET /api/<version>/users/:id/mobile-config
 * Get user's mobile preferences (notifications, privacy)
 */
router.get(
  '/:id/mobile-config',
  readLimiter,
  expressRouteWrapper(
    userMobileConfigController.getUserMobileConfig.bind(userMobileConfigController)
  )
);

/**
 * PUT /api/<version>/users/:id/mobile-config
 * Update user's mobile preferences
 */
router.put(
  '/:id/mobile-config',
  writeLimiter,
  expressRouteWrapper(
    userMobileConfigController.updateUserMobileConfig.bind(userMobileConfigController)
  )
);

export default router;
