// ================================================================
// src/models/SearchPinnedResult.ts
// ================================================================

import { DataTypes, Sequelize } from 'sequelize';
import { IdBaseModel } from './base/IdBaseModel';
import { TABLE_NAMES } from '@/utils/constants';
import { RESOURCE_TYPE_VALUES, ResourceType } from '@my-many-books/shared-types';

export interface SearchPinnedResultAttributes {
  id: number;
  resourceType: ResourceType;
  resourceId: number;
  priority: number;
  active: boolean;
  creationDate: Date;
  updateDate?: Date;
}

export interface SearchPinnedResultCreationAttributes {
  resourceType: ResourceType;
  resourceId: number;
  priority: number;
  active?: boolean;
}

export class SearchPinnedResult extends IdBaseModel<SearchPinnedResultAttributes, SearchPinnedResultCreationAttributes> implements SearchPinnedResultAttributes {
  public resourceType!: ResourceType;
  public resourceId!: number;
  public priority!: number;
  public active!: boolean;

  static override getTableName(): string {
    return TABLE_NAMES.SEARCH_PINNED_RESULTS;
  }

  static override getModelName(): string {
    return 'SearchPinnedResult';
  }

  static initModel(sequelize: Sequelize): typeof SearchPinnedResult {
    SearchPinnedResult.init(
      {
        ...this.getBaseAttributes(),
        resourceType: {
          type: DataTypes.ENUM(...RESOURCE_TYPE_VALUES),
          allowNull: false,
          field: 'resource_type',
        },
        resourceId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'resource_id',
        },
        priority: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        ...this.getBaseOptions(sequelize, TABLE_NAMES.SEARCH_PINNED_RESULTS),
        indexes: [
          ...this.getBaseOptions(sequelize, TABLE_NAMES.SEARCH_PINNED_RESULTS).indexes,
          {
            fields: ['resource_type', 'resource_id'],
            name: 'idx_resource',
          },
          {
            fields: ['resource_type', 'active', 'priority'],
            name: 'idx_priority',
          },
          {
            fields: ['resource_type', 'resource_id'],
            unique: true,
            name: 'idx_unique_resource_pin',
          },
        ],
      }
    );

    return SearchPinnedResult;
  }

  // Instance methods
  public override toJSON(): SearchPinnedResultAttributes {
    return {
      id: this.id,
      resourceType: this.resourceType,
      resourceId: this.resourceId,
      priority: this.priority,
      active: this.active,
      creationDate: this.creationDate,
      updateDate: this.updateDate,
    };
  }

  // Static query methods
  static async findByResource(
    resourceType: ResourceType,
    resourceId: number
  ): Promise<SearchPinnedResult | null> {
    return await SearchPinnedResult.findOne({
      where: {
        resourceType,
        resourceId,
      },
    });
  }

  static async findActiveByResourceType(resourceType: ResourceType): Promise<SearchPinnedResult[]> {
    return await SearchPinnedResult.findAll({
      where: {
        resourceType,
        active: true,
      },
      order: [['priority', 'ASC']],
    });
  }
}
