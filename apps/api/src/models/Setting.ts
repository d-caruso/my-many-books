// ================================================================
// src/models/Setting.ts
// Application settings model for runtime configuration
// ================================================================

import { DataTypes, Sequelize } from 'sequelize';
import { IdBaseModel } from './base/IdBaseModel';

export interface SettingAttributes {
  id: number;
  key: string;
  value: string;
  description?: string;
  creationDate: Date;
  updateDate?: Date;
}

export interface SettingCreationAttributes {
  key: string;
  value: string;
  description?: string;
}

export class Setting extends IdBaseModel<SettingAttributes, SettingCreationAttributes> implements SettingAttributes {
  public key!: string;
  public value!: string;
  public description?: string;
  public override creationDate!: Date;
  public override updateDate?: Date;

  static override getTableName(): string {
    return 'settings';
  }

  public static initModel(sequelize: Sequelize): typeof Setting {
    Setting.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        key: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
          comment: 'Setting key (unique identifier)',
        },
        value: {
          type: DataTypes.TEXT,
          allowNull: false,
          comment: 'Setting value (stored as string)',
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Human-readable description of the setting',
        },
        creationDate: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'creation_date',
          defaultValue: DataTypes.NOW,
        },
        updateDate: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'update_date',
        },
      },
      {
        sequelize,
        tableName: 'settings',
        timestamps: true,
        underscored: true,
        createdAt: 'creation_date',
        updatedAt: 'update_date',
      }
    );

    return Setting;
  }
}
