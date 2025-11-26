// ================================================================
// src/models/Category.ts
// ================================================================
import { DataTypes, Sequelize, Op } from 'sequelize';
import { IdBaseModel } from './base/IdBaseModel';
import { CategoryAttributes, CategoryCreationAttributes } from './interfaces/ModelInterfaces';
import { TABLE_NAMES } from '@/utils/constants';
import { createModel, findOrCreateModel } from '../utils/sequelize-helpers';

export class Category extends IdBaseModel<CategoryAttributes> implements CategoryAttributes {
  public name!: string;
  public userId!: number;

  static override getTableName(): string {
    return TABLE_NAMES.CATEGORIES;
  }

  static override getModelName(): string {
    return 'Category';
  }

  static initModel(sequelize: Sequelize): typeof Category {
    Category.init(
      {
        ...this.getBaseAttributes(),
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [1, 255],
          },
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'user_id',
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
      },
      {
        ...this.getBaseOptions(sequelize, TABLE_NAMES.CATEGORIES),
        indexes: [
          ...this.getBaseOptions(sequelize, TABLE_NAMES.CATEGORIES).indexes,
          {
            fields: ['user_id'],
            name: 'idx_category_user_id',
          },
          {
            fields: ['user_id', 'name'],
            unique: true,
            name: 'idx_category_user_name_unique',
          },
        ],
      }
    );

    return Category;
  }

  // Instance methods
  public override toJSON(): CategoryAttributes {
    return {
      id: this.id,
      name: this.name,
      userId: this.userId,
      creationDate: this.creationDate,
      updateDate: this.updateDate,
    };
  }

  // Static query methods
  static async findByName(name: string, userId: number): Promise<Category | null> {
    return await Category.findOne({
      where: {
        name: name.trim(),
        userId,
      },
    });
  }

  static async searchByName(searchTerm: string, userId: number): Promise<Category[]> {
    return await Category.findAll({
      where: {
        userId,
        name: {
          [Op.like]: `%${searchTerm}%`,
        },
      },
      order: [['name', 'ASC']],
    });
  }

  static async getAllCategories(userId: number): Promise<Category[]> {
    return await Category.findAll({
      where: { userId },
      order: [['name', 'ASC']],
    });
  }

  static async createCategory(categoryData: CategoryCreationAttributes): Promise<Category> {
    const normalizedName = categoryData.name.trim();

    // Check if category already exists FOR THIS USER
    const existingCategory = await Category.findByName(normalizedName, categoryData.userId);

    if (existingCategory) {
      return existingCategory;
    }

    try {
      return await createModel(Category, {
        name: normalizedName,
        userId: categoryData.userId,
      });
    } catch (error) {
      console.error('Category.create failed:', error);
      throw error;
    }
  }

  static async findOrCreateCategory(
    categoryData: CategoryCreationAttributes
  ): Promise<[Category, boolean]> {
    const normalizedName = categoryData.name.trim();

    return await findOrCreateModel(Category, {
      where: {
        name: normalizedName,
        userId: categoryData.userId,
      },
      defaults: {
        name: normalizedName,
        userId: categoryData.userId,
      },
    });
  }
}
