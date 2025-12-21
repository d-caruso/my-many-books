// ================================================================
// src/middleware/adminAuth.ts
// Admin authentication middleware for role-based access control
// ================================================================

import { getLogger } from '@my-many-books/shared-logging';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { User } from '../models/User';

/**
 * Middleware to check if the authenticated user has admin role.
 * Must be used after authMiddleware to ensure req.user exists.
 *
 * @example
 * router.get('/admin/users', authMiddleware, requireAdmin, AdminController.listUsers);
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Get full user from database to check role
    const user = await User.findByPk(req.user.id);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Check if user has admin role
    if (!user.isAdmin()) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required',
      });
      return;
    }

    // User is admin, proceed to next middleware
    next();
  } catch (error) {
    getLogger().error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'Admin authorization error:'
    );
    res.status(500).json({
      error: 'Authorization check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Middleware to check if the authenticated user has a specific role.
 * Must be used after authMiddleware to ensure req.user exists.
 *
 * @param allowedRole - The role to check for ('user' | 'admin')
 * @returns Express middleware function
 *
 * @example
 * router.get('/admin/stats', authMiddleware, requireRole('admin'), StatsController.getStats);
 */
export const requireRole = (allowedRole: 'user' | 'admin') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Get full user from database to check role
      const user = await User.findByPk(req.user.id);

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      // Check if user has the required role
      if (user.role !== allowedRole) {
        res.status(403).json({
          error: 'Forbidden',
          message: `${allowedRole} role required`,
        });
        return;
      }

      // User has required role, proceed to next middleware
      next();
    } catch (error) {
      getLogger().error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Role authorization error:'
      );
      res.status(500).json({
        error: 'Authorization check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};
