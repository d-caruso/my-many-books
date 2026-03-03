// ================================================================
// src/services/hooks/DatabaseHookStorage.ts
// HookStorage implementation backed by Sequelize models
// ================================================================

import { FindOptions } from 'sequelize';
import {
  HookConfig,
  HookExecution as HookExecutionRecord,
  HookStorage,
  HookStorageStats,
} from '@my-many-books/hookey';
import { Hook, HookExecution } from '../../models';
import {
  HookAttributes,
  HookExecutionAttributes,
  HookExecutionCreationAttributes,
} from '../../models/interfaces/ModelInterfaces';

export class DatabaseHookStorage implements HookStorage {
  constructor(
    private readonly hookModel: typeof Hook = Hook,
    private readonly hookExecutionModel: typeof HookExecution = HookExecution
  ) {}

  async getHooks(filters?: { isActive?: boolean }): Promise<HookConfig[]> {
    if (!this.canAccessHooks()) {
      return [];
    }

    const queryOptions: FindOptions = {
      order: [
        ['priority', 'DESC'],
        ['id', 'ASC'],
      ],
    };

    if (filters?.isActive !== undefined) {
      queryOptions.where = { isActive: filters.isActive };
    }

    const hooks = await this.hookModel.findAll(queryOptions);

    return hooks.map(hook => this.mapHookConfig(hook));
  }

  async getHook(id: string): Promise<HookConfig | null> {
    if (!this.canAccessHooks()) {
      return null;
    }

    const hook = await this.hookModel.findByPk(Number(id));
    return hook ? this.mapHookConfig(hook) : null;
  }

  // Hook mutations are handled by the admin API, not directly through HookSystem
  async createHook(): Promise<HookConfig> {
    return Promise.reject(new Error('Hook creation is managed via the admin API'));
  }

  async updateHook(): Promise<HookConfig> {
    return Promise.reject(new Error('Hook updates are managed via the admin API'));
  }

  async deleteHook(): Promise<void> {
    return Promise.reject(new Error('Hook deletion is managed via the admin API'));
  }

  async logExecution(execution: HookExecutionRecord): Promise<void> {
    if (!this.canAccessExecutions()) {
      return;
    }

    const payload: HookExecutionCreationAttributes = {
      hookId: Number(execution.hookId),
      eventName: execution.eventName,
      eventData: execution.eventData ?? null,
      success: execution.success,
      errorMessage: execution.errorMessage ?? null,
      executionTimeMs: execution.executionTimeMs ?? null,
      executedAt: execution.executedAt ?? new Date(),
    };

    await this.hookExecutionModel.create(payload);
  }

  async getExecutions(hookId: string, limit?: number): Promise<HookExecutionRecord[]> {
    if (!this.canAccessExecutions()) {
      return [];
    }

    const queryOptions: FindOptions = {
      where: { hookId: Number(hookId) },
      order: [['executedAt', 'DESC']],
    };

    if (limit !== undefined) {
      queryOptions.limit = limit;
    }

    const executions = await this.hookExecutionModel.findAll(queryOptions);

    return executions.map(record => this.mapExecution(record));
  }

  async getRecentExecutions(limit?: number): Promise<HookExecutionRecord[]> {
    if (!this.canAccessExecutions()) {
      return [];
    }

    const queryOptions: FindOptions = {
      order: [['executedAt', 'DESC']],
    };

    if (limit !== undefined) {
      queryOptions.limit = limit;
    }

    const executions = await this.hookExecutionModel.findAll(queryOptions);

    return executions.map(record => this.mapExecution(record));
  }

  async getStats(): Promise<HookStorageStats> {
    if (!this.canAccessHooks() || !this.canAccessExecutions()) {
      return {
        totalHooks: 0,
        activeHooks: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
      };
    }

    const [totalHooks, activeHooks, totalExecutions, successfulExecutions] = await Promise.all([
      this.hookModel.count(),
      this.hookModel.count({ where: { isActive: true } }),
      this.hookExecutionModel.count(),
      this.hookExecutionModel.count({ where: { success: true } }),
    ]);

    return {
      totalHooks,
      activeHooks,
      totalExecutions,
      successfulExecutions,
      failedExecutions: totalExecutions - successfulExecutions,
    };
  }

  private mapHookConfig(hook: Hook): HookConfig {
    const data: HookAttributes = hook.get({ plain: true });
    const config: HookConfig = {
      id: data.id.toString(),
      name: data.name,
      eventPattern: data.eventPattern,
      actionType: data.actionType,
      actionConfig: data.actionConfig ?? {},
      isActive: data.isActive,
      priority: data.priority,
    };

    if (data.description) {
      config.description = data.description;
    }

    if (data.creationDate) {
      config.createdAt = data.creationDate;
    }

    if (data.updateDate) {
      config.updatedAt = data.updateDate;
    }

    return config;
  }

  private mapExecution(record: HookExecution): HookExecutionRecord {
    const data: HookExecutionAttributes = record.get({ plain: true });
    const execution: HookExecutionRecord = {
      hookId: data.hookId.toString(),
      eventName: data.eventName,
      success: data.success,
      executedAt: data.executedAt ?? new Date(),
    };

    if (data.id) {
      execution.id = data.id.toString();
    }

    if (data.eventData) {
      execution.eventData = data.eventData;
    }

    if (data.errorMessage) {
      execution.errorMessage = data.errorMessage;
    }

    if (data.executionTimeMs !== null && data.executionTimeMs !== undefined) {
      execution.executionTimeMs = data.executionTimeMs;
    }

    return execution;
  }

  private canAccessHooks(): boolean {
    return Boolean(this.hookModel && typeof this.hookModel.findAll === 'function');
  }

  private canAccessExecutions(): boolean {
    return Boolean(
      this.hookExecutionModel && typeof this.hookExecutionModel.findAll === 'function'
    );
  }
}
