// ================================================================
// src/routes/userRoutes.ts
// User management routes
// ================================================================

import { Router } from 'express';
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

const router = Router();
const userController = container.get<UserController>(TYPES.UserController);

// All user routes require authentication
router.use(authMiddleware);

// User profile endpoints (without "profile" in URI)
// Apply granular rate limiting: separate limits for read vs write operations
router.get(
  '/',
  readLimiter,
  expressRouteWrapper(userController.getCurrentUser.bind(userController))
); // GET user info
router.put(
  '/',
  writeLimiter,
  validateBody(updateUserSchema),
  expressRouteWrapper(userController.updateCurrentUser.bind(userController))
); // PUT to update user info
router.delete(
  '/',
  writeLimiter,
  expressRouteWrapper(userController.deleteAccount.bind(userController))
); // DELETE account

// User books endpoints (READ)
router.get(
  '/books',
  readLimiter,
  validateQuery(getUserBooksQuerySchema),
  expressRouteWrapper(userController.getUserBooks.bind(userController))
);

// User statistics (READ)
router.get(
  '/stats',
  readLimiter,
  expressRouteWrapper(userController.getUserStats.bind(userController))
);

// Account deactivation (WRITE)
router.patch(
  '/',
  writeLimiter,
  expressRouteWrapper(userController.deactivateAccount.bind(userController))
); // PATCH to deactivate account

export default router;
