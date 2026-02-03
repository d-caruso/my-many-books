// ================================================================
// src/controllers/UserBaseController.ts
// Base controller with reusable helpers for user-related controllers
// ================================================================

import { BaseController } from './BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';

export abstract class UserBaseController extends BaseController {
  
  /** Helper method to check access and return boolean
   * @param request - The universal request containing the authenticated user
   * @param targetUserId - The userId of the resource being accessed
   * @returns boolean indicating if access is allowed
   */
  protected hasUserAccess(request: UniversalRequest, targetUserId: number): boolean {
    const currentUserId = request.user?.id;

    if (currentUserId === undefined || currentUserId === null) {
      return false;
    }

    if (currentUserId === targetUserId) {
      return true;
    }

    if (request.user?.isAdmin) {
      return true;
    }

    return false;
  }

  /** *Helper method to create a standardized access denied response
   * @param request - The universal request containing the authenticated user
   * @returns ApiResponse with 401 or 403 error
   */
  protected createAccessDeniedResponse(request: UniversalRequest): ApiResponse {
    const currentUserId = request.user?.id;

    // Must be authenticated
    if (currentUserId === undefined || currentUserId === null) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }

    return this.createErrorResponseI18n('errors:access_denied', 403);
  }
}
