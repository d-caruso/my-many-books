// ================================================================
// src/controllers/admin/AdminUserController.ts
// Admin user management controller
// ================================================================

import { inject, injectable } from 'inversify';
import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { TYPES } from '../../container/types';
import {
  AdminUserService,
  AdminUserServiceError,
  UserAdminContext,
} from '../../services/user/AdminUserService';
import { AdminUpdateUserDTO } from '../../dtos/user/AdminUpdateUserDTO';
import { toUserResponseDTO } from '../../dtos/user/UserResponseDTO';

@injectable()
export class AdminUserController extends BaseController {
  constructor(@inject(TYPES.AdminUserService) private readonly adminUserService: AdminUserService) {
    super();
    this.adminUserService.initializeControllerContext();
  }

  async getAllUsers(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const pagination = this.getPaginationParams(request);
    const search = this.getQueryParameter(request, 'search') ?? undefined;

    try {
      const options: Parameters<AdminUserService['listUsers']>[0] = {
        limit: pagination.limit,
        offset: pagination.offset,
      };
      if (search) {
        options.search = search;
      }

      const result = await this.adminUserService.listUsers(options);

      const meta = this.createPaginationMeta(
        pagination.page,
        pagination.limit,
        result.total
      );

      return this.createSuccessResponse(
        { users: result.rows.map(toUserResponseDTO) },
        undefined,
        meta
      );
    } catch (error) {
      return this.handleServiceError(error);
    }
  }

  async getUserById(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const userId = this.getPathParameter(request, 'id');
    if (!userId || isNaN(Number(userId))) {
      return this.createErrorResponseI18n('errors:user_id_required', 400);
    }

    try {
      const user = await this.adminUserService.getUserById(Number(userId));
      return this.createSuccessResponse(toUserResponseDTO(user));
    } catch (error) {
      return this.handleServiceError(error);
    }
  }

  async updateUser(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const userId = this.getPathParameter(request, 'id');
    if (!userId || isNaN(Number(userId))) {
      return this.createErrorResponseI18n('errors:user_id_required', 400);
    }

    const body = this.parseBody(request);
    const dto = AdminUpdateUserDTO.from(body);
    const errors = AdminUpdateUserDTO.validate(dto);
    if (errors.length > 0) {
      return this.createValidationErrorResponse(errors);
    }

    try {
      const updated = await this.adminUserService.updateUser(
        Number(userId),
        dto.toServiceInput(),
        this.getAdminContext(request)!
      );
      return this.createSuccessResponse(toUserResponseDTO(updated));
    } catch (error) {
      return this.handleServiceError(error);
    }
  }

  async deleteUser(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const userId = this.getPathParameter(request, 'id');
    if (!userId || isNaN(Number(userId))) {
      return this.createErrorResponseI18n('errors:user_id_required', 400);
    }

    try {
      await this.adminUserService.deleteUser(Number(userId), this.getAdminContext(request)!);
      return this.createSuccessResponse({ message: this.t('success:user_deleted') });
    } catch (error) {
      return this.handleServiceError(error);
    }
  }

  private ensureAuthenticated(request: UniversalRequest): ApiResponse | null {
    if (!request.user?.userId) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }
    return null;
  }

  private getAdminContext(request: UniversalRequest): UserAdminContext | null {
    if (!request.user) {
      return null;
    }
    const context: UserAdminContext = {
      userId: request.user.userId,
    };
    if (request.user.role) {
      context.role = request.user.role;
    }
    return context;
  }

  private createValidationErrorResponse(errors: string[]): ApiResponse {
    return this.createErrorResponseI18n('errors:validation_failed', 400, undefined, {
      errors,
    });
  }

  private handleServiceError(error: unknown): ApiResponse {
    if (!(error instanceof AdminUserServiceError)) {
      throw error;
    }

    switch (error.code) {
      case 'USER_NOT_FOUND':
        return this.createErrorResponseI18n('errors:user_not_found', 404);
      case 'EMAIL_EXISTS':
        return this.createErrorResponseI18n('errors:email_already_exists', 409);
      case 'FORBIDDEN':
        return this.createErrorResponseI18n('errors:permission_denied', 403);
      case 'INVALID_ROLE':
        return this.createErrorResponseI18n('errors:invalid_request_body', 400);
      case 'LAST_ADMIN':
        return this.createErrorResponse(this.t('errors:cannot_delete_last_admin'), 400);
      default:
        return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }
}
