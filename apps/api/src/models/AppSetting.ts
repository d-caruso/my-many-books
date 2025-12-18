// ================================================================
// src/models/AppSetting.ts
// Application Settings Model
// ================================================================

import { DataTypes, Sequelize } from 'sequelize';
import { BaseModel, BaseModelAttributes } from './base/BaseModel';
import { SettingType, SettingCategory } from '@my-many-books/shared-types';

export interface AppSettingAttributes extends BaseModelAttributes {
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
  public override creationDate!: Date;
  public override updateDate?: Date;

  static override getTableName(): string {
    return 'app_settings';
  }

  static getModelName(): string {
    return 'AppSetting';
  }

  static initModel(sequelize: Sequelize): typeof AppSetting {
    AppSetting.init(
      {
        ...BaseModel.getBaseAttributes(),
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
      },
      {
        ...BaseModel.getBaseOptions(sequelize, 'app_settings'),
        indexes: [
          ...BaseModel.getBaseOptions(sequelize, 'app_settings').indexes,
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
  public override toJSON(): AppSettingAttributes {
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
      creationDate: this.creationDate,
      updateDate: this.updateDate,
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
    } catch {
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
