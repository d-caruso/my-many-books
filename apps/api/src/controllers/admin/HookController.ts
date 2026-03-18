// ================================================================
// src/controllers/admin/HookController.ts
// Admin hook management controller
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import {
  HookCreationAttributes,
  HookUpdateAttributes,
} from '../../models/interfaces/ModelInterfaces';
import { hookRegistryService } from '../../services/hooks/HookRegistryService';
const HOOK_ACTION_TYPES = ['log', 'email', 'database'] as const;

const isHookActionType = (value: unknown): value is HookCreationAttributes['actionType'] =>
  typeof value === 'string' && HOOK_ACTION_TYPES.some(actionType => actionType === value);

export class HookController extends BaseController {
  private isHookCreationRequest(value: unknown): value is HookCreationAttributes {
    if (!this.isRecord(value)) {
      return false;
    }

    if (
      typeof value['name'] !== 'string' ||
      typeof value['eventPattern'] !== 'string' ||
      !isHookActionType(value['actionType']) ||
      !this.isRecord(value['actionConfig'])
    ) {
      return false;
    }

    return (
      (value['description'] === undefined ||
        value['description'] === null ||
        typeof value['description'] === 'string') &&
      (value['isActive'] === undefined || typeof value['isActive'] === 'boolean') &&
      (value['priority'] === undefined || typeof value['priority'] === 'number')
    );
  }

  private isHookUpdateRequest(value: unknown): value is HookUpdateAttributes {
    if (!this.isRecord(value)) {
      return false;
    }

    if (value['name'] !== undefined && typeof value['name'] !== 'string') {
      return false;
    }
    if (
      value['description'] !== undefined &&
      value['description'] !== null &&
      typeof value['description'] !== 'string'
    ) {
      return false;
    }
    if (value['eventPattern'] !== undefined && typeof value['eventPattern'] !== 'string') {
      return false;
    }
    if (
      value['actionType'] !== undefined &&
      !isHookActionType(value['actionType'])
    ) {
      return false;
    }
    if (value['actionConfig'] !== undefined && !this.isRecord(value['actionConfig'])) {
      return false;
    }
    if (value['isActive'] !== undefined && typeof value['isActive'] !== 'boolean') {
      return false;
    }
    if (value['priority'] !== undefined && typeof value['priority'] !== 'number') {
      return false;
    }

    return true;
  }

  async listHooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const pagination = this.getPaginationParams(request);
    const isActive = this.getQueryParameter(request, 'isActive');
    const search = this.getQueryParameter(request, 'search');

    const { count, rows: hooks } = await hookRegistryService.listHooks({
      limit: pagination.limit,
      offset: pagination.offset,
      isActive: isActive !== null && isActive !== undefined ? isActive === 'true' : undefined,
      search: search ?? undefined,
    });

    const meta = this.createPaginationMeta(pagination.page, pagination.limit, count);

    return this.createSuccessResponse({ hooks }, undefined, meta);
  }

  async getHook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const hookId = this.getPathParameter(request, 'id');
    if (!hookId || isNaN(Number(hookId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'hook' });
    }

    const hook = await hookRegistryService.getHook(Number(hookId));
    if (!hook) {
      return this.createErrorResponseI18n('errors:hook_not_found', 404);
    }

    return this.createSuccessResponse(hook.get({ plain: true }));
  }

  async createHook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    if (!this.isHookCreationRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      const hookData: HookCreationAttributes = {
        name: body.name,
        description: body.description ?? null,
        eventPattern: body.eventPattern,
        actionType: body.actionType,
        actionConfig: body.actionConfig,
        isActive: body.isActive ?? true,
        priority: body.priority ?? 0,
        createdBy: request.user?.id ?? null,
      };
      const hook = await hookRegistryService.createHook(hookData, request);

      return this.createSuccessResponse(
        hook.get({ plain: true }),
        'Hook created successfully',
        undefined,
        201
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 400);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async updateHook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const hookId = this.getPathParameter(request, 'id');
    if (!hookId || isNaN(Number(hookId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'hook' });
    }

    const body = this.parseBody(request);
    if (!this.isHookUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      const hook = await hookRegistryService.updateHook(Number(hookId), body, request);
      if (!hook) {
        return this.createErrorResponseI18n('errors:hook_not_found', 404);
      }

      return this.createSuccessResponse(hook.get({ plain: true }), 'Hook updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 400);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async deleteHook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const hookId = this.getPathParameter(request, 'id');
    if (!hookId || isNaN(Number(hookId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'hook' });
    }

    try {
      const hook = await hookRegistryService.deleteHook(Number(hookId), request);
      if (!hook) {
        return this.createErrorResponseI18n('errors:hook_not_found', 404);
      }

      return this.createSuccessResponse(null, 'Hook deleted successfully', undefined, 204);
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 400);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async reloadHooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      return this.createSuccessResponse(await hookRegistryService.reloadHooks(request.user));
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async getHookExecutions(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const hookId = this.getPathParameter(request, 'id');
    if (!hookId || isNaN(Number(hookId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'hook' });
    }

    const pagination = this.getPaginationParams(request);
    const successParam = this.getQueryParameter(request, 'success');
    const fromParam = this.getQueryParameter(request, 'from');
    const toParam = this.getQueryParameter(request, 'to');

    const executionsResult = await hookRegistryService.getHookExecutions(Number(hookId), {
      limit: pagination.limit,
      offset: pagination.offset,
      success:
        successParam === 'true' ? true : successParam === 'false' ? false : undefined,
      from: fromParam ?? undefined,
      to: toParam ?? undefined,
    });
    if (!executionsResult) {
      return this.createErrorResponseI18n('errors:hook_not_found', 404);
    }
    const { count, rows: executions } = executionsResult;

    const meta = this.createPaginationMeta(pagination.page, pagination.limit, count);

    return this.createSuccessResponse({ executions }, undefined, meta);
  }

  async getRecentExecutions(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const limit = Number(this.getQueryParameter(request, 'limit')) || 50;
    const executions = await hookRegistryService.getRecentExecutions(limit);

    return this.createSuccessResponse({ executions });
  }

  async getHookStats(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    return this.createSuccessResponse(await hookRegistryService.getHookStats());
  }
}

export const hookController = new HookController();
