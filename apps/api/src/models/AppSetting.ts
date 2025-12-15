// ================================================================
// src/models/AppSetting.ts
// Application Settings Model
// ================================================================

import { DataTypes, Sequelize } from 'sequelize';
import { BaseModel } from './base/BaseModel';

export type SettingType = 'string' | 'number' | 'boolean' | 'enum' | 'json';
export type SettingCategory = 'ui' | 'api' | 'features' | 'business' | 'security';

export interface AppSettingAttributes {
  key: string;
  value: string;
  category: SettingCategory;
  type: SettingType;
  defaultValue: string;
  description?: string;
  active: boolean;
  deleted: boolean;
  deletedAt?: Date;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettingCreationAttributes {
  key: string;
  value: string;
  category: SettingCategory;
  type: SettingType;
  defaultValue: string;
  description?: string;
  active?: boolean;
  deleted?: boolean;
}

export class AppSetting extends BaseModel<AppSettingAttributes> implements AppSettingAttributes {
  public key!: string;
  public value!: string;
  public category!: SettingCategory;
  public type!: SettingType;
  public defaultValue!: string;
  public description?: string;
  public active!: boolean;
  public deleted!: boolean;
  public deletedAt?: Date;
  public lastSyncedAt?: Date;
  public readonly createdAt!: Date;
  public updatedAt!: Date;

  static getTableName(): string {
    return 'app_settings';
  }

  static getModelName(): string {
    return 'AppSetting';
  }

  static initModel(sequelize: Sequelize): typeof AppSetting {
    AppSetting.init(
      {
        key: {
          type: DataTypes.STRING(100),
          primaryKey: true,
          allowNull: false,
        },
        value: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        category: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM('string', 'number', 'boolean', 'enum', 'json'),
          allowNull: false,
        },
        defaultValue: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: 'default_value',
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        deleted: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'deleted_at',
        },
        lastSyncedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'last_synced_at',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'created_at',
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'updated_at',
        },
      },
      {
        sequelize,
        tableName: 'app_settings',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          {
            fields: ['active', 'deleted'],
            name: 'idx_app_settings_active_deleted',
          },
          {
            fields: ['category'],
            name: 'idx_app_settings_category',
          },
        ],
      }
    );

    return AppSetting;
  }

  // Instance methods
  public toJSON(): AppSettingAttributes {
    return {
      key: this.key,
      value: this.value,
      category: this.category,
      type: this.type,
      defaultValue: this.defaultValue,
      description: this.description,
      active: this.active,
      deleted: this.deleted,
      deletedAt: this.deletedAt,
      lastSyncedAt: this.lastSyncedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Parse the stored value based on the setting type
   */
  public getParsedValue(): unknown {
    try {
      switch (this.type) {
        case 'string':
          return JSON.parse(this.value);
        case 'number':
          return Number(JSON.parse(this.value));
        case 'boolean':
          return JSON.parse(this.value) === true;
        case 'enum':
          return JSON.parse(this.value);
        case 'json':
          return JSON.parse(this.value);
        default:
          return this.value;
      }
    } catch (error) {
      // If parsing fails, return default value
      return JSON.parse(this.defaultValue);
    }
  }

  // Static query methods
  static async findByKey(key: string): Promise<AppSetting | null> {
    return await AppSetting.findByPk(key);
  }

  static async findActiveSettings(): Promise<AppSetting[]> {
    return await AppSetting.findAll({
      where: {
        active: true,
        deleted: false,
      },
      order: [['category', 'ASC'], ['key', 'ASC']],
    });
  }

  static async findByCategory(category: SettingCategory): Promise<AppSetting[]> {
    return await AppSetting.findAll({
      where: {
        category,
        active: true,
        deleted: false,
      },
      order: [['key', 'ASC']],
    });
  }

  static async findDeletedSettings(): Promise<AppSetting[]> {
    return await AppSetting.findAll({
      where: {
        deleted: true,
      },
      order: [['deletedAt', 'DESC']],
    });
  }
}
