// ================================================================
// src/controllers/admin/HookController.ts
// Admin hook management controller
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { Hook, HookExecution } from '../../models';
import {
  HookCreationAttributes,
  HookUpdateAttributes,
} from '../../models/interfaces/ModelInterfaces';
import { Op, CreationAttributes } from 'sequelize';
import { getAuditLogService } from '../../services/AuditLogService';
import { reloadHookSystem } from '../../services/hooks/hookSystem';

let lastReloadedAt: string | null = null;

export class HookController extends BaseController {
  async listHooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const pagination = this.getPaginationParams(request);
    const isActive = this.getQueryParameter(request, 'isActive');
    const search = this.getQueryParameter(request, 'search');

    const where: Record<string, unknown> = {};

    if (isActive !== null && isActive !== undefined) {
      where['isActive'] = isActive === 'true';
    }

    if (search) {
      where[Op.or as unknown as string] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { eventPattern: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: hooks } = await Hook.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [
        ['priority', 'DESC'],
        ['creationDate', 'DESC'],
      ],
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

    const hook = await Hook.findByPk(Number(hookId));
    if (!hook) {
      return this.createErrorResponseI18n('errors:hook_not_found', 404);
    }

    return this.createSuccessResponse(hook.get({ plain: true }));
  }

  async createHook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody<HookCreationAttributes>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    // Basic validation
    if (!body.name || !body.eventPattern || !body.actionType || !body.actionConfig) {
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

      const hook = await Hook.create(hookData as CreationAttributes<Hook>);

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        'create',
        'hook',
        String(hook.id),
        {
          name: hook.name,
          eventPattern: hook.eventPattern,
          actionType: hook.actionType,
        }
      );

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
      return this.createErrorResponse('Failed to create hook', 500);
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

    const body = this.parseBody<HookUpdateAttributes>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    const hook = await Hook.findByPk(Number(hookId));
    if (!hook) {
      return this.createErrorResponseI18n('errors:hook_not_found', 404);
    }

    try {
      const oldValues = hook.get({ plain: true });
      await hook.update(body as Partial<Hook>);

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        'update',
        'hook',
        String(hook.id),
        {
          changes: body,
          oldValues: {
            name: oldValues.name,
            isActive: oldValues.isActive,
            eventPattern: oldValues.eventPattern,
          },
        }
      );

      return this.createSuccessResponse(hook.get({ plain: true }), 'Hook updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 400);
      }
      return this.createErrorResponse('Failed to update hook', 500);
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

    const hook = await Hook.findByPk(Number(hookId));
    if (!hook) {
      return this.createErrorResponseI18n('errors:hook_not_found', 404);
    }

    try {
      const hookData = hook.get({ plain: true });
      await hook.destroy();

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        'delete',
        'hook',
        String(hookData.id),
        {
          name: hookData.name,
          eventPattern: hookData.eventPattern,
        }
      );

      return this.createSuccessResponse(null, 'Hook deleted successfully', undefined, 204);
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 400);
      }
      return this.createErrorResponse('Failed to delete hook', 500);
    }
  }

  async reloadHooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      await reloadHookSystem();
      lastReloadedAt = new Date().toISOString();
      return this.createSuccessResponse({ reloadedAt: lastReloadedAt });
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to reload hooks', 500);
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

    const hook = await Hook.findByPk(Number(hookId));
    if (!hook) {
      return this.createErrorResponseI18n('errors:hook_not_found', 404);
    }

    const pagination = this.getPaginationParams(request);

    const successParam = this.getQueryParameter(request, 'success');
    const fromParam = this.getQueryParameter(request, 'from');
    const toParam = this.getQueryParameter(request, 'to');

    const where: Record<string, unknown> = { hookId: Number(hookId) };
    if (successParam === 'true') {
      where['success'] = true;
    } else if (successParam === 'false') {
      where['success'] = false;
    }

    if (fromParam || toParam) {
      const range: Record<string, Date> = {};
      if (fromParam) {
        range[Op.gte as unknown as string] = new Date(fromParam);
      }
      if (toParam) {
        range[Op.lte as unknown as string] = new Date(toParam);
      }
      where['executedAt'] = range;
    }

    const { count, rows: executions } = await HookExecution.findAndCountAll({
      where,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['executedAt', 'DESC']],
    });

    const meta = this.createPaginationMeta(pagination.page, pagination.limit, count);

    return this.createSuccessResponse({ executions }, undefined, meta);
  }

  async getRecentExecutions(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const limit = Number(this.getQueryParameter(request, 'limit')) || 50;
    const maxLimit = Math.min(limit, 200); // Cap at 200

    const executions = await HookExecution.findAll({
      limit: maxLimit,
      order: [['executedAt', 'DESC']],
      include: [
        {
          model: Hook,
          as: 'hook',
          attributes: ['id', 'name', 'eventPattern'],
        },
      ],
    });

    return this.createSuccessResponse({ executions });
  }

  async getHookStats(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const totalHooks = await Hook.count();
    const activeHooks = await Hook.count({ where: { isActive: true } });
    const totalExecutions = await HookExecution.count();
    const successfulExecutions = await HookExecution.count({ where: { success: true } });
    const failedExecutions = await HookExecution.count({ where: { success: false } });
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const executionsToday = await HookExecution.count({
      where: { executedAt: { [Op.gte]: startOfDay } },
    });

    const stats = {
      totalHooks,
      activeHooks,
      inactiveHooks: totalHooks - activeHooks,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      executionsToday,
      lastReloadedAt,
      successRate:
        totalExecutions > 0 ? ((successfulExecutions / totalExecutions) * 100).toFixed(2) : '0.00',
    };

    return this.createSuccessResponse(stats);
  }
}

export const hookController = new HookController();
