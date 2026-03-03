// ================================================================
// apps/api/src/middleware/authorization.ts
// CASL-based Authorization Middleware
// ================================================================

import { getLogger } from '@my-many-books/shared-logging';
import { i18n } from '@my-many-books/shared-i18n';
import { ERROR_CODES, createErrorResponse } from '@my-many-books/shared-types';
import { Request, Response, NextFunction } from 'express';
import { createAbilityFor, Action, Resource } from '@my-many-books/shared-auth';

/**
 * Extended Request type with user
 */
interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'user' | 'admin';
  };
}

/**
 * Middleware to check if user has required permission
 * Uses CASL to evaluate permissions based on user role and resource ownership
 *
 * @param action - The action to check (create, read, update, delete, manage)
 * @param resource - The resource type (Book, Author, Category, User, all)
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * router.delete('/books/:id',
 *   authenticateRequest,
 *   requirePermission(ACTIONS.DELETE, RESOURCES.BOOK),
 *   BookController.delete
 * );
 * ```
 */
export const requirePermission = (action: Action, resource: Resource) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Get authenticated user from request (set by auth middleware)
    const authReq = req as AuthRequest;
    const user = authReq.user;

    try {
      // Create CASL ability for this user
      const ability = createAbilityFor(user || null);

      // Check if user can perform action on resource
      if (!ability.can(action, resource)) {
        res.status(403).json(createErrorResponse(
          ERROR_CODES.PERMISSION_DENIED,
          i18n.t('errors:permission_denied'),
          {
            action,
            resource,
            authenticated: !!user,
            role: user?.role || 'anonymous',
          }
        ));
        return;
      }

      // Permission granted - continue to next middleware/handler
      next();
      return;
    } catch (error) {
      // Log error for debugging
      getLogger().error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
          action,
          resource,
          userId: user?.id,
        },
        '[Authorization Middleware] Error'
      );

      res.status(500).json(createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        i18n.t('errors:internal_error')
      ));
      return;
    }
  };
};
