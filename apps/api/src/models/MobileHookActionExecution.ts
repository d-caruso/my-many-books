// ================================================================
// src/models/MobileHookActionExecution.ts
// Persisted per-action execution results for mobile analytics events
// ================================================================

import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { TABLE_NAMES } from '../utils/constants';

export type MobileHookActionExecutionStatus = 'success' | 'failed' | 'skipped';

export interface MobileHookActionExecutionAttributes {
  id: number;
  mobileAnalyticsEventId: number;
  actionType: string;
  status: MobileHookActionExecutionStatus;
  errorMessage?: string | null;
  details?: Record<string, unknown> | null;
  executionTimeMs?: number | null;
  executedAt: Date;
}

export type MobileHookActionExecutionCreationAttributes = Optional<
  MobileHookActionExecutionAttributes,
  'id' | 'errorMessage' | 'details' | 'executionTimeMs' | 'executedAt'
>;

export class MobileHookActionExecution extends Model<
  MobileHookActionExecutionAttributes,
  MobileHookActionExecutionCreationAttributes
> implements MobileHookActionExecutionAttributes {
  public id!: number;
  public mobileAnalyticsEventId!: number;
  public actionType!: string;
  public status!: MobileHookActionExecutionStatus;
  public errorMessage?: string | null;
  public details?: Record<string, unknown> | null;
  public executionTimeMs?: number | null;
  public executedAt!: Date;

  public static initModel(sequelize: Sequelize): typeof MobileHookActionExecution {
    MobileHookActionExecution.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        mobileAnalyticsEventId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'mobile_analytics_event_id',
        },
        actionType: {
          type: DataTypes.STRING(100),
          allowNull: false,
          field: 'action_type',
          validate: {
            notEmpty: true,
            len: [1, 100],
          },
        },
        status: {
          type: DataTypes.ENUM('success', 'failed', 'skipped'),
          allowNull: false,
        },
        errorMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'error_message',
        },
        details: {
          type: DataTypes.JSON,
          allowNull: true,
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
        modelName: 'MobileHookActionExecution',
        tableName: TABLE_NAMES.MOBILE_HOOK_ACTION_EXECUTIONS,
        timestamps: false, // We use executedAt instead
        indexes: [
          {
            fields: ['mobile_analytics_event_id'],
          },
          {
            fields: ['action_type'],
          },
          {
            fields: ['status'],
          },
          {
            fields: ['executed_at'],
          },
          {
            fields: ['action_type', 'executed_at'],
          },
          {
            fields: ['mobile_analytics_event_id', 'executed_at'],
          },
        ],
      }
    );

    return MobileHookActionExecution;
  }
}

export default MobileHookActionExecution;

