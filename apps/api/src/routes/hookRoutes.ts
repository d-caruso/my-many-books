// ================================================================
// src/routes/hookRoutes.ts
// Hook management routes - admin only
// ================================================================

import { Router } from 'express';
import { expressRouteWrapper } from '../utils/routeWrapper';
import { hookController } from '../controllers/admin/HookController';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { ACTIONS, RESOURCES } from '@my-many-books/shared-auth';
import { adminLimiter, readLimiter, writeLimiter } from '../middleware/rateLimiters';
import {
  validateQuery,
  validateBody,
  validateParams,
  createHookBodySchema,
  updateHookBodySchema,
  listHooksQuerySchema,
  getExecutionsQuerySchema,
  getRecentExecutionsQuerySchema,
  hookIdParamSchema,
} from '../validation';

const router = Router();

// All hook routes require authentication AND admin role
router.use(authMiddleware);
router.use(requirePermission(ACTIONS.MANAGE, RESOURCES.ALL));

// Apply base admin rate limiting to all hook routes
router.use(adminLimiter);

// ===== HOOK CRUD ENDPOINTS =====

// List all hooks with optional filters (READ)
router.get(
  '/',
  readLimiter,
  validateQuery(listHooksQuerySchema),
  expressRouteWrapper(hookController.listHooks.bind(hookController))
);

// Get single hook by ID (READ)
router.get(
  '/:id',
  readLimiter,
  validateParams(hookIdParamSchema),
  expressRouteWrapper(hookController.getHook.bind(hookController))
);

// Create new hook (WRITE)
router.post(
  '/',
  writeLimiter,
  validateBody(createHookBodySchema),
  expressRouteWrapper(hookController.createHook.bind(hookController))
);

// Update hook (WRITE)
router.put(
  '/:id',
  writeLimiter,
  validateParams(hookIdParamSchema),
  validateBody(updateHookBodySchema),
  expressRouteWrapper(hookController.updateHook.bind(hookController))
);

// Delete hook (WRITE)
router.delete(
  '/:id',
  writeLimiter,
  validateParams(hookIdParamSchema),
  expressRouteWrapper(hookController.deleteHook.bind(hookController))
);

// ===== HOOK EXECUTION ENDPOINTS =====

// Get execution history for specific hook (READ)
router.get(
  '/:id/executions',
  readLimiter,
  validateParams(hookIdParamSchema),
  validateQuery(getExecutionsQuerySchema),
  expressRouteWrapper(hookController.getHookExecutions.bind(hookController))
);

// Get recent executions across all hooks (READ)
router.get(
  '/executions/recent',
  readLimiter,
  validateQuery(getRecentExecutionsQuerySchema),
  expressRouteWrapper(hookController.getRecentExecutions.bind(hookController))
);

// ===== HOOK STATISTICS ENDPOINTS =====

// Get hook statistics (READ)
router.get(
  '/stats/summary',
  readLimiter,
  expressRouteWrapper(hookController.getHookStats.bind(hookController))
);

export default router;
