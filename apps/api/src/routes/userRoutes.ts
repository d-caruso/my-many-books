// ================================================================
// src/routes/userRoutes.ts
// User management routes
// ================================================================

import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// User profile endpoints (without "profile" in URI)
router.get('/', (req, res) => UserController.getCurrentUser(req, res)); // GET user info
router.put('/', (req, res) => UserController.updateCurrentUser(req, res)); // PUT to update user info
router.delete('/', (req, res) => UserController.deleteAccount(req, res)); // DELETE to delete account (no "delete" in URI)

// User books endpoints
router.get('/books', (req, res) => UserController.getUserBooks(req, res));

// User statistics
router.get('/stats', (req, res) => UserController.getUserStats(req, res));

// Account deactivation (PUT without "deactivate" in URI - but needs different route to avoid conflict)
router.patch('/', (req, res) => UserController.deactivateAccount(req, res)); // PATCH to deactivate account (no "deactivate" in URI)

export default router;
