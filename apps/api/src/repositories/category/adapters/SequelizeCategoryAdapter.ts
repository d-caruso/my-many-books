// ================================================================
// repositories/category/adapters/SequelizeCategoryAdapter.ts
// Sequelize-backed adapter for the Category repository
// ================================================================

import { FindAndCountOptions, FindOptions, IncludeOptions, Op, QueryTypes, WhereOptions, fn, col, where as sequelizeWhere } from 'sequelize';
import { SORT_DIRECTIONS } from '@my-many-books/shared-types';
import { Category } from '@/models/Category';
import { Book } from '@/models/Book';
import {
  CategoryCreationAttributes,
} from '@/models/interfaces/ModelInterfaces';
import { createModel } from '@/utils/sequelize-helpers';
import {
  CategoryEntity,
  CategoryListFilters,
  CategoryListOptions,
  CategoryQueryOptions,
  PaginatedResult,
} from '../CategoryRepositoryTypes';
import { CategoryRepositoryAdapter } from './CategoryRepositoryAdapter';

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
      where: {
        [Op.and]: [
          sequelizeWhere(fn('LOWER', col('name')), name.toLowerCase()),
          { userId },
        ],
      },
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
    const category = await createModel(Category, payload, {
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
          as: 'categories',
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
    filters: Partial<CategoryListFilters>,
    options?: CategoryListOptions
  ): { query: FindAndCountOptions; limit: number; offset: number } {
    const { limit, offset } = this.getPagination(options);
    const where = this.buildWhereClause(filters);
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
        name: { [Op.like]: `%${filters.name}%` },
      });
    }

    if (filters?.userId !== undefined) {
      where.userId = filters.userId;
    }

    // Incremental sync support for mobile clients
    if (filters?.updatedSince) {
      const since = new Date(filters.updatedSince);
      if (!isNaN(since.getTime())) {
        where.updateDate = { [Op.gt]: since };
      }
    }

    return where;
  }

  private buildOrderClause(options?: CategoryListOptions): [string, string][] {
    const orderBy = options?.orderBy ?? 'name';
    const direction = options?.orderDirection ?? SORT_DIRECTIONS.ASC;
    return [[orderBy, direction]];
  }

  private getPagination(options?: CategoryListOptions): { limit: number; offset: number } {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    return { limit, offset };
  }

  async searchFulltext(
    query: string,
    userId?: number,
    limit = 20,
    offset = 0
  ): Promise<{
    rows: CategoryEntity[];
    total: number;
    relevanceScores: Map<number, number>;
  }> {
    const sql = `
      SELECT
        c.id, c.name, c.user_id as userId,
        c.creation_date as creationDate, c.update_date as updateDate,
        MATCH(c.name) AGAINST(:query IN NATURAL LANGUAGE MODE) as relevance
      FROM categories c
      WHERE MATCH(c.name) AGAINST(:query IN NATURAL LANGUAGE MODE)
        ${userId ? 'AND c.user_id = :userId' : ''}
      ORDER BY relevance DESC, c.id ASC
      LIMIT :limit OFFSET :offset
    `;

    const countSql = `
      SELECT COUNT(*) as total
      FROM categories c
      WHERE MATCH(c.name) AGAINST(:query IN NATURAL LANGUAGE MODE)
        ${userId ? 'AND c.user_id = :userId' : ''}
    `;

    const replacements: Record<string, unknown> = { query, limit, offset };
    if (userId) {
      replacements['userId'] = userId;
    }

    interface CategoryFulltextRow extends CategoryEntity { relevance: number; }
    interface CountRow { total: number; }

    const [results, countResults] = await Promise.all([
      Category.sequelize!.query<CategoryFulltextRow>(sql, {
        replacements,
        type: QueryTypes.SELECT,
      }),
      Category.sequelize!.query<CountRow>(countSql, {
        replacements: { query, ...(userId ? { userId } : {}) },
        type: QueryTypes.SELECT,
      }),
    ]);

    const rows = results;
    const total = countResults[0]?.total ?? 0;

    const relevanceScores = new Map<number, number>();
    rows.forEach(row => {
      relevanceScores.set(row.id, row.relevance);
    });

    return { rows, total, relevanceScores };
  }

  async searchLike(
    query: string,
    userId?: number,
    limit = 20,
    offset = 0
  ): Promise<{
    rows: CategoryEntity[];
    total: number;
  }> {
    const where: WhereOptions<Category> = {
      name: { [Op.like]: `%${query}%` },
    };

    if (userId !== undefined) {
      where['userId'] = userId;
    }

    const { rows, count } = await Category.findAndCountAll({
      where,
      limit,
      offset,
      order: [
        ['name', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    return {
      rows: rows.map(row => this.toDomain(row)).filter((e): e is CategoryEntity => e !== null),
      total: count,
    };
  }

  async findPinned(userId?: number): Promise<Array<{
    resourceId: number;
    priority: number;
  }>> {
    const sql = `
      SELECT
        spr.resource_id as resourceId,
        spr.priority
      FROM search_pinned_results spr
      INNER JOIN categories c ON spr.resource_id = c.id
      WHERE spr.resource_type = 'category'
        AND spr.active = true
        ${userId ? 'AND c.user_id = :userId' : ''}
      ORDER BY spr.priority ASC
    `;

    const replacements: Record<string, unknown> = {};
    if (userId) {
      replacements['userId'] = userId;
    }

    interface PinnedRow { resourceId: number; priority: number; }

    return Category.sequelize!.query<PinnedRow>(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });
  }
}
