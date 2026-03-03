// ================================================================
// src/models/AuditLog.ts
// AuditLog model for tracking user actions and changes
// ================================================================

import { DataTypes, Sequelize } from 'sequelize';
import { IdBaseModel } from './base/IdBaseModel';

export interface AuditLogAttributes {
  id: number;
  userId: number;
  role?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  creationDate: Date;
}

export interface AuditLogCreationAttributes {
  userId: number;
  role?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
}

export interface AuditLogFilterAttributes {
  userId?: number;
  resourceType?: string;
  action?: string;

  // Range query for dates
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
}

export class AuditLog extends IdBaseModel<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public userId!: number;
  public role?: string;
  public action!: string;
  public resourceType!: string;
  public resourceId!: string;
  public details?: Record<string, unknown>;
  public ipAddress?: string;
  public userAgent?: string;
  public createdAt!: Date;
  public override creationDate!: Date;

  static override getTableName(): string {
    return 'audit_logs';
  }

  public static initModel(sequelize: Sequelize): typeof AuditLog {
    AuditLog.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'user_id',
          comment: 'User who performed the action',
          references: {
            model: 'users',
            key: 'id',
          },
        },
        role: {
          type: DataTypes.STRING(50),
          allowNull: true,
          comment: 'User role at time of action',
        },
        action: {
          type: DataTypes.STRING(100),
          allowNull: false,
          comment: 'Action performed (create, update, delete, etc.)',
        },
        resourceType: {
          type: DataTypes.STRING(100),
          allowNull: false,
          field: 'resource_type',
          comment: 'Type of resource affected (book, user, hook, etc.)',
        },
        resourceId: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'resource_id',
          comment: 'ID of the resource affected',
        },
        details: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: 'Additional details about the action',
        },
        ipAddress: {
          type: DataTypes.STRING(45),
          allowNull: true,
          field: 'ip_address',
          comment: 'IP address of the client',
        },
        userAgent: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'user_agent',
          comment: 'User agent string from the request',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'created_at',
          defaultValue: DataTypes.NOW,
        },
        creationDate: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'created_at',
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: 'audit_logs',
        timestamps: false, // We only track createdAt
        underscored: true,
      }
    );

    return AuditLog;
  }
}
