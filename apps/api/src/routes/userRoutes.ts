// ================================================================
// src/routes/userRoutes.ts
// User management routes
// ================================================================

import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authMiddleware } from '../middleware/auth';
import { standardLimiter, readLimiter, writeLimiter } from '../middleware/rateLimiters';
import {
  validateBody,
  validateQuery,
  updateUserSchema,
  getUserBooksQuerySchema,
} from '../validation';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// Apply standard rate limiting to user routes for backwards compatibility
router.use(standardLimiter);

// User profile endpoints (without "profile" in URI)
// Apply granular rate limiting: separate limits for read vs write operations
router.get('/', readLimiter, (req, res) => UserController.getCurrentUser(req, res)); // GET user info
router.put('/', writeLimiter, validateBody(updateUserSchema), (req, res) => UserController.updateCurrentUser(req, res)); // PUT to update user info
router.delete('/', writeLimiter, (req, res) => UserController.deleteAccount(req, res)); // DELETE to delete account (no "delete" in URI)

// User books endpoints (READ)
router.get('/books', readLimiter, validateQuery(getUserBooksQuerySchema), (req, res) => UserController.getUserBooks(req, res));

// User statistics (READ)
router.get('/stats', readLimiter, (req, res) => UserController.getUserStats(req, res));

// Account deactivation (WRITE)
router.patch('/', writeLimiter, (req, res) => UserController.deactivateAccount(req, res)); // PATCH to deactivate account (no "deactivate" in URI)

export default router;