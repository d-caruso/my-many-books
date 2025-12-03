// ================================================================
// repositories/category/adapters/SequelizeCategoryAdapter.ts
// Sequelize-backed adapter for the Category repository
// ================================================================

import { FindAndCountOptions, FindOptions, IncludeOptions, Op, WhereOptions } from 'sequelize';
import { Category } from '@/models/Category';
import { Book } from '@/models/Book';
import {
  CategoryAttributes,
  CategoryCreationAttributes,
} from '@/models/interfaces/ModelInterfaces';
import {
  CategoryEntity,
  CategoryListFilters,
  CategoryListOptions,
  CategoryQueryOptions,
  PaginatedResult,
} from '../CategoryRepositoryTypes';
import { CategoryRepositoryAdapter } from './CategoryRepositoryAdapter';
import type { SearchFilters } from '../../interfaces/adapters/RepositoryAdapter';

export class SequelizeCategoryAdapter implements CategoryRepositoryAdapter {
  findById(id: number, options?: CategoryQueryOptions): Promise<CategoryEntity | null> {
    return Category.findByPk(id, this.buildFindOptions(options)).then(category =>
      this.toDomain(category)
    );
  }

  async findUserCategoryById(
    id: number,
    userId: number,
    options?: CategoryQueryOptions
  ): Promise<CategoryEntity | null> {
    const category = await Category.findOne({
      ...this.buildFindOptions(options),
      where: { id, userId },
    });
    return this.toDomain(category);
  }

  async findByName(
    name: string,
    userId: number,
    options?: CategoryQueryOptions
  ): Promise<CategoryEntity | null> {
    const category = await Category.findOne({
      ...this.buildFindOptions(options),
      where: { name, userId },
    });
    return this.toDomain(category);
  }

  async list(options?: CategoryListOptions): Promise<PaginatedResult<CategoryEntity>> {
    const { limit, offset } = this.getPagination(options);
    const where = this.buildWhereClause(options?.filters);
    const query: FindAndCountOptions = {
      where,
      limit,
      offset,
      order: this.buildOrderClause(options),
      distinct: true,
    };

    const include = this.buildIncludeClause(options?.includeBooks);
    if (include) {
      query.include = include;
    }

    const { rows, count } = await Category.findAndCountAll(query);
    return this.buildPaginatedResult(rows, count, limit, offset);
  }

  async searchByQuery(
    term: string,
    userId: number,
    limit = 20
  ): Promise<Array<Pick<CategoryEntity, 'id' | 'name'>>> {
    const normalized = term.trim();
    if (normalized.length < 2) {
      return [];
    }

    const categories = await Category.findAll({
      where: {
        userId,
        name: {
          [Op.like]: `%${normalized}%`,
        },
      },
      attributes: ['id', 'name', 'userId', 'creationDate', 'updateDate'],
      order: [['name', 'ASC']],
      limit,
    });

    return categories.map(category => category.get({ plain: true }));
  }

  async createModel(
    payload: CategoryCreationAttributes,
    options?: CategoryQueryOptions
  ): Promise<CategoryEntity> {
    const transaction = options?.transaction ?? null;
    const category = await Category.create(payload as CategoryAttributes, {
      transaction,
    });
    return (await this.findById(category.id, options))!;
  }

  async updateModel(
    id: number,
    payload: Partial<CategoryCreationAttributes>,
    options?: CategoryQueryOptions
  ): Promise<CategoryEntity | null> {
    const category = await Category.findByPk(id);
    if (!category) {
      return null;
    }

    const transaction = options?.transaction ?? null;
    await category.update(payload, { transaction });
    return this.findById(id, options);
  }

  deleteModel(id: number): Promise<number> {
    return Category.destroy({ where: { id } });
  }

  countBooks(categoryId: number): Promise<number> {
    return Book.count({
      include: [
        {
          model: Category,
          as: 'Categories',
          where: { id: categoryId },
          required: true,
        },
      ],
      distinct: true,
    });
  }

  buildFindOptions(options?: CategoryQueryOptions): FindOptions<Category> {
    const include = this.buildIncludeClause(options?.includeBooks);
    const query: FindOptions<Category> = {};
    if (options?.transaction) {
      query.transaction = options.transaction;
    }
    if (include) {
      query.include = include;
    }
    return query;
  }

  buildListQuery(
    filters: SearchFilters,
    options?: CategoryListOptions
  ): { query: FindAndCountOptions; limit: number; offset: number } {
    const typedFilters = (filters as Partial<CategoryListFilters>) || {};
    const { limit, offset } = this.getPagination(options);
    const where = this.buildWhereClause(typedFilters);
    const query: FindAndCountOptions = {
      where,
      limit,
      offset,
      order: this.buildOrderClause(options),
      distinct: true,
    };

    const include = this.buildIncludeClause(options?.includeBooks);
    if (include) {
      query.include = include;
    }

    return { query, limit, offset };
  }

  syncAssociations(): Promise<void> {
    return Promise.resolve();
  }

  toDomain(category: Category | CategoryEntity | null): CategoryEntity | null {
    if (!category) {
      return null;
    }

    if (typeof (category as Category).get === 'function') {
      return (category as Category).get({ plain: true }) as CategoryEntity;
    }

    return category as CategoryEntity;
  }

  buildPaginatedResult(
    rows: Category[],
    total: number,
    limit: number,
    offset: number
  ): PaginatedResult<CategoryEntity> {
    const entities = rows
      .map(row => this.toDomain(row))
      .filter((entity): entity is CategoryEntity => Boolean(entity));

    return {
      rows: entities,
      total,
      limit,
      offset,
    };
  }

  private buildIncludeClause(includeBooks?: boolean): IncludeOptions[] | undefined {
    if (!includeBooks) {
      return undefined;
    }

    return [
      {
        model: Book,
        as: 'Books',
        through: { attributes: [] },
      },
    ];
  }

  private buildWhereClause(filters?: Partial<CategoryListFilters>): WhereOptions<Category> {
    const where: WhereOptions<Category> = {};

    if (filters?.name) {
      Object.assign(where, {
        name: { [Op.iLike]: `%${filters.name}%` },
      });
    }

    if (filters?.userId !== undefined) {
      where.userId = filters.userId;
    }

    return where;
  }

  private buildOrderClause(options?: CategoryListOptions): [string, 'ASC' | 'DESC'][] {
    const orderBy = options?.orderBy ?? 'name';
    const direction = options?.orderDirection ?? 'ASC';
    return [[orderBy, direction]];
  }

  private getPagination(options?: CategoryListOptions): { limit: number; offset: number } {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    return { limit, offset };
  }
}
