// ================================================================
// src/models/base/BaseModel.ts
// ================================================================

import { Model, DataTypes, Sequelize } from 'sequelize';

// Base interface with only timestamps
export interface BaseModelAttributes {
  creationDate: Date;
  updateDate?: Date | undefined;
}

export interface BaseModelAttributeDefinitions {
  creationDate: {
    type: typeof DataTypes.DATE;
    allowNull: boolean;
    defaultValue: typeof DataTypes.NOW;
    field: string;
  };
  updateDate: {
    type: typeof DataTypes.DATE;
    allowNull: boolean;
    field: string;
  };
}

export interface BaseModelOptions {
  sequelize: Sequelize;
  tableName: string;
  timestamps: boolean;
  underscored: boolean;
  createdAt: string;
  updatedAt: string;
  indexes: Array<{ fields: string[] }>;
}

// Base model with only timestamps (for junction tables)
export abstract class BaseModel<T extends BaseModelAttributes, TCreation extends object = T> extends Model<T, TCreation> {
  public readonly creationDate!: Date;
  public updateDate?: Date;

  protected static getBaseAttributes(): BaseModelAttributeDefinitions {
    return {
      creationDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'creation_date',
      },
      updateDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'update_date',
      },
    };
  }

  protected static getBaseOptions(sequelize: Sequelize, tableName: string): BaseModelOptions {
    return {
      sequelize,
      tableName,
      timestamps: true,
      underscored: true,
      createdAt: 'creation_date',
      updatedAt: 'update_date',
      indexes: [
        {
          fields: ['creation_date'],
        },
      ],
    };
  }
}
