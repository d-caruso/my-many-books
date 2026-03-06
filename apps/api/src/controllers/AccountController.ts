// ================================================================
// src/controllers/AccountController.ts
// Account-level actions: deactivate and change password
// ================================================================

import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { ChangePasswordResponseSchema, createErrorResponse, ERROR_CODES } from '@my-many-books/shared-types';
import { UserBaseController } from './base/UserBaseController';
import { ApiResponse } from '../common/ApiResponse';
import { UniversalRequest } from '../types';
import { TYPES } from '../container/types';
import { UserService as UserServiceImpl, UserServiceError } from '../services/user/UserService';
import { AuthenticatedRequest, UserService } from '../middleware/auth';
import { COGNITO_PASSWORD_ERRORS, cognitoPasswordService } from '../services/auth/cognitoPasswordService';
import { setRefreshTokenCookie } from '../services/auth/googleOAuth';
import { AUTH_COOKIE_PATH } from '../constants/api';
import { COGNITO_ERRORS } from '../constants/cognito';

@injectable()
export class AccountController extends UserBaseController {
  constructor(@inject(TYPES.UserService) private readonly userService: UserServiceImpl) {
    super();
    this.userService.initializeControllerContext();
  }

  async deactivateAccount(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const userId = this.getIdParam(request);
    if (userId === null) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'user' });
    }

    if (!this.hasUserAccess(request, userId)) {
      return this.createAccessDeniedResponse(request);
    }

    try {
      await this.userService.deactivateAccount(userId);
      return this.createSuccessResponse(null, this.t('common:account_deactivated'));
    } catch (error) {
      return this.handleServiceError(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    await this.initializeI18n({ headers: req.headers } as UniversalRequest);

    const authenticatedRequest = req as AuthenticatedRequest;
    if (!authenticatedRequest.user) {
      res
        .status(401)
        .json(createErrorResponse(ERROR_CODES.AUTH_FAILED, this.t('errors:auth_required')));
      return;
    }

    const userIdRaw = req.params['id'];
    const userIdValue = Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw;
    const userIdParam = Number.parseInt(userIdValue ?? '', 10);
    if (!Number.isInteger(userIdParam) || userIdParam <= 0) {
      res
        .status(400)
        .json(
          createErrorResponse(
            ERROR_CODES.INVALID_REQUEST_BODY,
            this.t('errors:valid_id_required', { resource: 'user' })
          )
        );
      return;
    }

    if (authenticatedRequest.user.id !== userIdParam) {
      res
        .status(403)
        .json(
          createErrorResponse(
            ERROR_CODES.FORBIDDEN,
            this.t('errors:owner_only', { resource: 'password' })
          )
        );
      return;
    }

    const { currentPassword, newPassword, locale } = req.body as {
      currentPassword?: string;
      newPassword?: string;
      locale?: string;
    };

    if (!currentPassword || !newPassword) {
      res
        .status(400)
        .json(
          createErrorResponse(
            ERROR_CODES.INVALID_REQUEST_BODY,
            this.t('errors:invalid_request_body')
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
          .json(createErrorResponse(ERROR_CODES.USER_NOT_FOUND, this.t('errors:user_not_found')));
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
            error instanceof Error ? error.message : this.t('errors:validation_failed')
          )
        );
        return;
      }

      if (errorName === COGNITO_ERRORS.NOT_AUTHORIZED) {
        res
          .status(401)
          .json(createErrorResponse(ERROR_CODES.AUTH_FAILED, this.t('errors:auth_failed')));
        return;
      }

      if (errorName === COGNITO_ERRORS.LIMIT_EXCEEDED || errorName === COGNITO_ERRORS.TOO_MANY_REQUESTS) {
        res
          .status(429)
          .json(
            createErrorResponse(
              ERROR_CODES.RATE_LIMIT_EXCEEDED,
              this.t('errors:rate_limit_exceeded')
            )
          );
        return;
      }

      if (errorName === COGNITO_PASSWORD_ERRORS.COGNITO_CONFIG_ERROR_NAME) {
        res
          .status(500)
          .json(
            createErrorResponse(ERROR_CODES.INTERNAL_ERROR, this.t('errors:service_unavailable'))
          );
        return;
      }

      next(error);
    }
  }

  private handleServiceError(error: unknown): ApiResponse {
    if (!(error instanceof UserServiceError)) {
      throw error;
    }

    switch (error.code) {
      case 'USER_NOT_FOUND':
        return this.createErrorResponseI18n('errors:user_not_found', 404);
      default:
        return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }
}
