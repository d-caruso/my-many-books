// ================================================================
// src/routes/userRoutes.ts
// User management routes
// ================================================================

import express, { Router, NextFunction, Request, Response } from 'express';
import {
  ChangePasswordResponseSchema,
  createErrorResponse,
  ERROR_CODES,
  USER_ACCOUNT_PATCH_ACTIONS,
} from '@my-many-books/shared-types';
import { authMiddleware, AuthenticatedRequest, UserService } from '../middleware/auth';
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
import { COGNITO_PASSWORD_ERRORS, cognitoPasswordService } from '../services/auth/cognitoPasswordService';
import { setRefreshTokenCookie } from '../services/auth/googleOAuth';

const router: express.Router = Router();
const userController = container.get<UserController>(TYPES.UserController);
const deactivateAccountHandler = expressRouteWrapper(userController.deactivateAccount.bind(userController));

const API_PREFIX = process.env['API_PREFIX'] || '/api';
const API_ROUTE_VERSION = process.env['API_ROUTE_VERSION'] || 'v1';
const AUTH_COOKIE_PATH = `${API_PREFIX}/${API_ROUTE_VERSION}/auth`;

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
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const action = (req.body as { action?: string } | undefined)?.action;
    if (action !== USER_ACCOUNT_PATCH_ACTIONS.CHANGE_PASSWORD) {
      await deactivateAccountHandler(req, res, next);
      return;
    }

    const authenticatedRequest = req as AuthenticatedRequest;
    if (!authenticatedRequest.user) {
      res.status(401).json(createErrorResponse(ERROR_CODES.AUTH_FAILED, 'Authentication required'));
      return;
    }

    const userIdRaw = req.params['id'];
    const userIdValue = Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw;
    const userIdParam = Number.parseInt(userIdValue ?? '', 10);
    if (!Number.isInteger(userIdParam) || userIdParam <= 0) {
      res.status(400).json(
        createErrorResponse(ERROR_CODES.INVALID_REQUEST_BODY, 'A valid user id is required')
      );
      return;
    }

    if (authenticatedRequest.user.id !== userIdParam) {
      res.status(403).json(
        createErrorResponse(ERROR_CODES.FORBIDDEN, 'You can only change your own password')
      );
      return;
    }

    const { currentPassword, newPassword, locale } = req.body as {
      currentPassword?: string;
      newPassword?: string;
      locale?: string;
    };

    if (!currentPassword || !newPassword) {
      res.status(400).json(
        createErrorResponse(
          ERROR_CODES.INVALID_REQUEST_BODY,
          'Current password and new password are required'
        )
      );
      return;
    }

    try {
      const session = await cognitoPasswordService.changePassword({
        email: authenticatedRequest.user.email,
        currentPassword,
        newPassword,
        locale,
      });

      const user = await UserService.getUserById(userIdParam);
      if (!user) {
        res
          .status(404)
          .json(createErrorResponse(ERROR_CODES.USER_NOT_FOUND, 'User not found'));
        return;
      }

      setRefreshTokenCookie(res, session.refreshToken, AUTH_COOKIE_PATH);

      const responseData = ChangePasswordResponseSchema.parse({
        changed: true,
        accessToken: session.accessToken,
        idToken: session.idToken,
        expiresIn: session.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          surname: user.surname,
          role: user.role,
          isActive: user.isActive,
        },
      });

      res.status(200).json({
        success: true,
        data: responseData,
        message: 'Password changed successfully',
      });
    } catch (error: unknown) {
      const errorName = (error as { name?: string }).name;

      if (errorName === COGNITO_PASSWORD_ERRORS.INVALID_PASSWORD_POLICY_ERROR_NAME) {
        res.status(400).json(
          createErrorResponse(
            ERROR_CODES.VALIDATION_FAILED,
            error instanceof Error ? error.message : 'Password does not meet requirements'
          )
        );
        return;
      }

      if (errorName === 'NotAuthorizedException') {
        res.status(401).json(
          createErrorResponse(ERROR_CODES.AUTH_FAILED, 'Current password is incorrect')
        );
        return;
      }

      if (errorName === 'LimitExceededException' || errorName === 'TooManyRequestsException') {
        res.status(429).json(
          createErrorResponse(
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            'Too many requests. Please try again later.'
          )
        );
        return;
      }

      if (errorName === COGNITO_PASSWORD_ERRORS.COGNITO_CONFIG_ERROR_NAME) {
        res.status(500).json(
          createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Password change is currently unavailable')
        );
        return;
      }

      next(error);
    }
  }
); // PATCH for account actions (deactivate/change password)

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
