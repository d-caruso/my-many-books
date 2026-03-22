// ================================================================
// src/models/Hook.ts
// Hook model for managing event hooks
// ================================================================

import { DataTypes, Association, Sequelize } from 'sequelize';
import { IdBaseModel } from './base/IdBaseModel';
import { HookAttributes, HookActionType, HookCreationAttributes } from './interfaces/ModelInterfaces';
import { User } from './User';
import { HookExecution } from './HookExecution';

export class Hook extends IdBaseModel<HookAttributes, HookCreationAttributes> implements HookAttributes {
  public name!: string;
  public description?: string | null;
  public eventPattern!: string;
  public actionType!: HookActionType;
  public actionConfig!: Record<string, unknown>;
  public isActive!: boolean;
  public priority!: number;
  public createdBy?: number | null;
  public override updateDate?: Date;

  // Associations
  public creator?: User;
  public executions?: HookExecution[];

  // Association definitions
  public static override associations: {
    creator: Association<Hook, User>;
    executions: Association<Hook, HookExecution>;
  };

  static override getTableName(): string {
    return 'hooks';
  }

  public static initModel(sequelize: Sequelize): typeof Hook {
    Hook.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [1, 255],
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        eventPattern: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'event_pattern',
          validate: {
            notEmpty: true,
            len: [1, 255],
          },
        },
        actionType: {
          type: DataTypes.ENUM('log', 'email', 'database'),
          allowNull: false,
          field: 'action_type',
          validate: {
            isIn: [['log', 'email', 'database']],
          },
        },
        actionConfig: {
          type: DataTypes.JSON,
          allowNull: false,
          field: 'action_config',
          get(): Record<string, unknown> {
            const value = this.getDataValue('actionConfig') as Record<string, unknown> | string;
            // MySQL 8.0 returns JSON columns as objects, MariaDB returns them as strings
            return typeof value === 'string' ? JSON.parse(value) as Record<string, unknown> : value;
          },
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: 'is_active',
        },
        priority: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'created_by',
        },
        creationDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'creation_date',
        },
        updateDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'update_date',
        },
      },
      {
        sequelize,
        modelName: 'Hook',
        tableName: 'hooks',
        timestamps: true,
        createdAt: 'creationDate',
        updatedAt: 'updateDate',
        indexes: [
          {
            fields: ['event_pattern'],
          },
          {
            fields: ['is_active'],
          },
          {
            fields: ['priority'],
          },
          {
            fields: ['created_by'],
          },
          {
            fields: ['is_active', 'priority'],
          },
        ],
      }
    );

    return Hook;
  }

  public static associate(): void {
    // Hook belongs to User (creator)
    Hook.belongsTo(User, {
      foreignKey: 'createdBy',
      as: 'creator',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    // Hook has many HookExecutions
    Hook.hasMany(HookExecution, {
      foreignKey: 'hookId',
      as: 'executions',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  }
}
