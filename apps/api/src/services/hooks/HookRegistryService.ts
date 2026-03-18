import { Op, type WhereOptions } from 'sequelize';
import { Hook, HookExecution } from '../../models';
import type { UniversalRequest } from '../../types';
import type {
  HookAttributes,
  HookCreationAttributes,
  HookExecutionAttributes,
  HookUpdateAttributes,
} from '../../models/interfaces/ModelInterfaces';
import { createModel } from '../../utils/sequelize-helpers';
import { getAuditLogService } from '../AuditLogService';
import { reloadHookSystem } from './hookSystem';
import { controlPlaneHookService } from './ControlPlaneHookService';
import { EVENTS } from './events';

let lastReloadedAt: string | null = null;

export interface HookListOptions {
  limit: number;
  offset: number;
  isActive?: boolean;
  search?: string;
}

export interface HookExecutionListOptions {
  limit: number;
  offset: number;
  success?: boolean;
  from?: string;
  to?: string;
}

class HookRegistryService {
  async listHooks(options: HookListOptions) {
    const where: WhereOptions<HookAttributes> = {};

    if (typeof options.isActive === 'boolean') {
      where.isActive = options.isActive;
    }

    if (options.search) {
      Object.assign(where, {
        [Op.or]: [
          { name: { [Op.like]: `%${options.search}%` } },
          { description: { [Op.like]: `%${options.search}%` } },
          { eventPattern: { [Op.like]: `%${options.search}%` } },
        ],
      });
    }

    return Hook.findAndCountAll({
      where,
      limit: options.limit,
      offset: options.offset,
      order: [
        ['priority', 'DESC'],
        ['creationDate', 'DESC'],
      ],
    });
  }

  async getHook(id: number) {
    return Hook.findByPk(id);
  }

  async createHook(input: HookCreationAttributes, request: UniversalRequest) {
    const actor = controlPlaneHookService.getActorContext(request.user);

    try {
      void controlPlaneHookService.emitLifecycleEvent(EVENTS.HOOK.CREATE, 'BEFORE', {
        actor,
        input,
      });

      const hook = await createModel(Hook, input);

      getAuditLogService().logActionFromRequest(request, 'create', 'hook', String(hook.id), {
        name: hook.name,
        eventPattern: hook.eventPattern,
        actionType: hook.actionType,
      });

      void controlPlaneHookService.emitLifecycleEvent(EVENTS.HOOK.CREATE, 'AFTER', {
        actor,
        hook: hook.get({ plain: true }),
      });

      return hook;
    } catch (error) {
      void controlPlaneHookService.emitLifecycleEvent(EVENTS.HOOK.CREATE, 'FAILURE', {
        actor,
        input,
        error,
      });
      throw error;
    }
  }

  async updateHook(id: number, changes: HookUpdateAttributes, request: UniversalRequest) {
    const hook = await Hook.findByPk(id);
    if (!hook) {
      return null;
    }

    const actor = controlPlaneHookService.getActorContext(request.user);
    const previousHook = hook.get({ plain: true });

    try {
      void controlPlaneHookService.emitLifecycleEvent(EVENTS.HOOK.UPDATE, 'BEFORE', {
        actor,
        hookId: id,
        changes,
        hook: previousHook,
      });

      await hook.update(changes);

      getAuditLogService().logActionFromRequest(request, 'update', 'hook', String(hook.id), {
        changes,
        oldValues: {
          name: previousHook.name,
          isActive: previousHook.isActive,
          eventPattern: previousHook.eventPattern,
        },
      });

      void controlPlaneHookService.emitLifecycleEvent(EVENTS.HOOK.UPDATE, 'AFTER', {
        actor,
        hookId: id,
        hook: hook.get({ plain: true }),
        previousHook,
        changes,
      });

      return hook;
    } catch (error) {
      void controlPlaneHookService.emitLifecycleEvent(EVENTS.HOOK.UPDATE, 'FAILURE', {
        actor,
        hookId: id,
        changes,
        error,
      });
      throw error;
    }
  }

  async deleteHook(id: number, request: UniversalRequest) {
    const hook = await Hook.findByPk(id);
    if (!hook) {
      return null;
    }

    const actor = controlPlaneHookService.getActorContext(request.user);
    const hookData = hook.get({ plain: true });

    try {
      void controlPlaneHookService.emitLifecycleEvent(EVENTS.HOOK.DELETE, 'BEFORE', {
        actor,
        hookId: id,
        hook: hookData,
      });

      await hook.destroy();

      getAuditLogService().logActionFromRequest(request, 'delete', 'hook', String(hookData.id), {
        name: hookData.name,
        eventPattern: hookData.eventPattern,
      });

      void controlPlaneHookService.emitLifecycleEvent(EVENTS.HOOK.DELETE, 'AFTER', {
        actor,
        hookId: id,
        hook: hookData,
      });

      return hookData;
    } catch (error) {
      void controlPlaneHookService.emitLifecycleEvent(EVENTS.HOOK.DELETE, 'FAILURE', {
        actor,
        hookId: id,
        error,
      });
      throw error;
    }
  }

  async reloadHooks(user: UniversalRequest['user']) {
    const actor = controlPlaneHookService.getActorContext(user);

    try {
      void controlPlaneHookService.emitLifecycleEvent(EVENTS.HOOK.RELOAD, 'BEFORE', {
        actor,
      });

      await reloadHookSystem();
      lastReloadedAt = new Date().toISOString();

      void controlPlaneHookService.emitLifecycleEvent(EVENTS.HOOK.RELOAD, 'AFTER', {
        actor,
        reloadedAt: lastReloadedAt,
      });

      return { reloadedAt: lastReloadedAt };
    } catch (error) {
      void controlPlaneHookService.emitLifecycleEvent(EVENTS.HOOK.RELOAD, 'FAILURE', {
        actor,
        error,
      });
      throw error;
    }
  }

  async getHookExecutions(id: number, options: HookExecutionListOptions) {
    const hook = await Hook.findByPk(id);
    if (!hook) {
      return null;
    }

    const where: WhereOptions<HookExecutionAttributes> = { hookId: id };
    if (typeof options.success === 'boolean') {
      where.success = options.success;
    }

    if (options.from || options.to) {
      const range: { [Op.gte]?: Date; [Op.lte]?: Date } = {};
      if (options.from) {
        range[Op.gte] = new Date(options.from);
      }
      if (options.to) {
        range[Op.lte] = new Date(options.to);
      }
      where.executedAt = range;
    }

    const executions = await HookExecution.findAndCountAll({
      where,
      limit: options.limit,
      offset: options.offset,
      order: [['executedAt', 'DESC']],
    });

    return { hook, ...executions };
  }

  async getRecentExecutions(limit: number) {
    return HookExecution.findAll({
      limit: Math.min(limit, 200),
      order: [['executedAt', 'DESC']],
      include: [
        {
          model: Hook,
          as: 'hook',
          attributes: ['id', 'name', 'eventPattern'],
        },
      ],
    });
  }

  async getHookStats() {
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

    return {
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
  }
}

export const hookRegistryService = new HookRegistryService();
