import { Sequelize, DataTypes, Model, Optional, ModelCtor, FindOptions } from 'sequelize';
import {
  HookConfig,
  HookExecution,
  HookStorage,
  HookStorageStats,
} from '../types';

type HookCreationAttributes = Optional<
  HookConfig,
  'id' | 'createdAt' | 'updatedAt'
>;

type ExecutionCreationAttributes = Optional<HookExecution, 'id'>;

export class SequelizeHookStorage implements HookStorage {
  private HookModel: ModelCtor<Model<HookConfig, HookCreationAttributes>>;
  private ExecutionModel: ModelCtor<Model<HookExecution, ExecutionCreationAttributes>>;

  constructor(private sequelize: Sequelize) {
    const Hook = this.sequelize.define<Model<HookConfig, HookCreationAttributes>>(
      'Hook',
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
        },
        name: DataTypes.STRING,
        description: DataTypes.TEXT,
        eventPattern: DataTypes.STRING,
        actionType: DataTypes.STRING,
        actionConfig: DataTypes.JSON,
        isActive: DataTypes.BOOLEAN,
        priority: DataTypes.INTEGER,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
      },
      { timestamps: false }
    );

    const Execution = this.sequelize.define<Model<HookExecution, ExecutionCreationAttributes>>(
      'HookExecution',
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
        },
        hookId: DataTypes.STRING,
        eventName: DataTypes.STRING,
        eventData: DataTypes.JSON,
        success: DataTypes.BOOLEAN,
        errorMessage: DataTypes.TEXT,
        executionTimeMs: DataTypes.INTEGER,
        executedAt: DataTypes.DATE,
      },
      { timestamps: false }
    );

    Hook.hasMany(Execution, { foreignKey: 'hookId' });
    Execution.belongsTo(Hook, { foreignKey: 'hookId' });

    this.HookModel = Hook;
    this.ExecutionModel = Execution;
  }

  async init(): Promise<void> {
    await this.sequelize.sync();
  }

  async getHooks(filters?: { isActive?: boolean }): Promise<HookConfig[]> {
    const options: FindOptions<HookConfig> = {};
    if (filters?.isActive !== undefined) {
      options.where = { isActive: filters.isActive };
    }
    const records = await this.HookModel.findAll(options);
    return records.map((record) => record.get());
  }

  async getHook(id: string): Promise<HookConfig | null> {
    const record = await this.HookModel.findByPk(id);
    return record ? record.get() : null;
  }

  async createHook(
    hook: Omit<HookConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<HookConfig> {
    const id = `${Date.now()}-${Math.random()}`;
    const record = await this.HookModel.create({
      ...hook,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return record.get();
  }

  async updateHook(id: string, updates: Partial<HookConfig>): Promise<HookConfig> {
    const record = await this.HookModel.findByPk(id);
    if (!record) throw new Error('Hook not found');
    await record.update({ ...updates, updatedAt: new Date() });
    return record.get();
  }

  async deleteHook(id: string): Promise<void> {
    await this.HookModel.destroy({ where: { id } });
  }

  async logExecution(execution: HookExecution): Promise<void> {
    const id = execution.id || `${Date.now()}-${Math.random()}`;
    await this.ExecutionModel.create({
      ...execution,
      id,
      executedAt: execution.executedAt || new Date(),
    } as ExecutionCreationAttributes);
  }

  async getExecutions(hookId: string, limit?: number): Promise<HookExecution[]> {
    const options: FindOptions<HookExecution> = {
      where: { hookId },
      order: [['executedAt', 'DESC']],
    };

    if (limit !== undefined) {
      options.limit = limit;
    }

    const records = await this.ExecutionModel.findAll(options);
    return records.map((record) => record.get());
  }

  async getRecentExecutions(limit?: number): Promise<HookExecution[]> {
    const options: FindOptions<HookExecution> = {
      order: [['executedAt', 'DESC']],
    };

    if (limit !== undefined) {
      options.limit = limit;
    }

    const records = await this.ExecutionModel.findAll(options);
    return records.map((record) => record.get());
  }

  async getStats(): Promise<HookStorageStats> {
    const totalHooks = await this.HookModel.count();
    const activeHooks = await this.HookModel.count({ where: { isActive: true } });
    const totalExecutions = await this.ExecutionModel.count();
    const successfulExecutions = await this.ExecutionModel.count({ where: { success: true } });
    const failedExecutions = totalExecutions - successfulExecutions;
    return { totalHooks, activeHooks, totalExecutions, successfulExecutions, failedExecutions };
  }
}
