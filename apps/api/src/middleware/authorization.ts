// ================================================================
// apps/api/src/middleware/authorization.ts
// CASL-based Authorization Middleware
// ================================================================

import { getLogger } from '@my-many-books/shared-logging';
import { Request, Response, NextFunction } from 'express';
import { createAbilityFor, Action, Resource } from '@my-many-books/shared-auth';

/**
 * Extended Request type with user and i18n translator
 */
interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'user' | 'admin';
  };
  t?: (key: string) => string;
}

/**
 * Type for fallback translator function
 */
type TranslatorFunction = (key: string) => string;

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
        // Get i18n translator from request (if available)
        // Falls back to English key if translator not available
        const t: TranslatorFunction =
          authReq.t ||
          ((key: string): string => {
            // Fallback to English messages
            const fallbackMessages: Record<string, string> = {
              'errors:permission_denied': 'You do not have permission to perform this action',
              'errors:admin_only': 'This action requires administrator privileges',
              'errors:internal_server_error': 'Internal server error',
            };
            return fallbackMessages[key] || key;
          });

        res.status(403).json({
          success: false,
          error: t('errors:permission_denied'),
          details: {
            action,
            resource,
            authenticated: !!user,
            role: user?.role || 'anonymous',
          },
        });
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

      const t: TranslatorFunction =
        authReq.t ||
        ((key: string): string => {
          return key === 'errors:internal_server_error' ? 'Internal server error' : key;
        });

      res.status(500).json({
        success: false,
        error: t('errors:internal_server_error'),
      });
      return;
    }
  };
};
