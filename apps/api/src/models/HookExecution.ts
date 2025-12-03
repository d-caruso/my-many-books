// ================================================================
// src/models/HookExecution.ts
// HookExecution model for logging hook execution history
// ================================================================

import { DataTypes, Model, Sequelize, Association } from 'sequelize';
import { HookExecutionAttributes } from './interfaces/ModelInterfaces';
import { Hook } from './Hook';

export class HookExecution
  extends Model<HookExecutionAttributes>
  implements HookExecutionAttributes
{
  public id!: number;
  public hookId!: number;
  public eventName!: string;
  public eventData?: Record<string, unknown> | null;
  public success!: boolean;
  public errorMessage?: string | null;
  public executionTimeMs?: number | null;
  public executedAt!: Date;

  // Associations
  public hook?: Hook;

  // Association definitions
  public static override associations: {
    hook: Association<HookExecution, Hook>;
  };

  static override getTableName(): string {
    return 'hook_executions';
  }

  public static initModel(sequelize: Sequelize): typeof HookExecution {
    HookExecution.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        hookId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'hook_id',
        },
        eventName: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'event_name',
          validate: {
            notEmpty: true,
            len: [1, 255],
          },
        },
        eventData: {
          type: DataTypes.JSON,
          allowNull: true,
          field: 'event_data',
        },
        success: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
        },
        errorMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'error_message',
        },
        executionTimeMs: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'execution_time_ms',
        },
        executedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'executed_at',
        },
      },
      {
        sequelize,
        modelName: 'HookExecution',
        tableName: 'hook_executions',
        timestamps: false, // We use executedAt instead
        indexes: [
          {
            fields: ['hook_id'],
          },
          {
            fields: ['event_name'],
          },
          {
            fields: ['executed_at'],
          },
          {
            fields: ['success'],
          },
          {
            fields: ['hook_id', 'executed_at'],
          },
        ],
      }
    );

    return HookExecution;
  }

  public static associate(): void {
    // HookExecution belongs to Hook
    HookExecution.belongsTo(Hook, {
      foreignKey: 'hookId',
      as: 'hook',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  }
}
