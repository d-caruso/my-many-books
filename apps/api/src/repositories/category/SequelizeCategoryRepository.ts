// ================================================================
// src/repositories/category/SequelizeCategoryRepository.ts
// Sequelize-backed implementation of the Category repository contract
// ================================================================

import { injectable } from 'inversify';
import { FindAndCountOptions, FindOptions, IncludeOptions, Op, WhereOptions } from 'sequelize';
import { Category } from '@/models/Category';
import { Book } from '@/models/Book';
import { CategoryAttributes, CategoryCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import {
  CategoryEntity,
  CategoryListFilters,
  CategoryListOptions,
  CategoryQueryOptions,
  CategoryUpdateInput,
  PaginatedResult,
} from './CategoryRepository.types';
import { ICategoryRepository } from './ICategoryRepository';

@injectable()
export class SequelizeCategoryRepository implements ICategoryRepository {
  async findById(id: number, options?: CategoryQueryOptions): Promise<CategoryEntity | null> {
    const category = await Category.findByPk(id, this.buildFindOptions(options));
    return this.toDomain(category);
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

  async create(
    payload: CategoryCreationAttributes,
    options?: CategoryQueryOptions
  ): Promise<CategoryEntity> {
    const category = await Category.create(payload as CategoryAttributes, {
      transaction: options?.transaction ?? null,
    });
    return (await this.findById(category.id, options))!;
  }

  async update(
    id: number,
    payload: CategoryUpdateInput,
    options?: CategoryQueryOptions
  ): Promise<CategoryEntity | null> {
    const category = await Category.findByPk(id);
    if (!category) {
      return null;
    }

    await category.update(payload, { transaction: options?.transaction ?? null });
    return this.findById(id, options);
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await Category.destroy({ where: { id } });
    return deleted > 0;
  }

  async countBooks(categoryId: number): Promise<number> {
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

  // ===== Helpers ==========================================================

  private buildFindOptions(options?: CategoryQueryOptions): FindOptions<Category> {
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
      where.name = { [Op.iLike]: `%${filters.name}%` } as any;
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

  private buildPaginatedResult(
    rows: Category[],
    total: number,
    limit: number,
    offset: number
  ): PaginatedResult<CategoryEntity> {
    const entities = rows.map(row => this.toDomain(row)).filter(Boolean) as CategoryEntity[];
    return { rows: entities, total, limit, offset };
  }

  private toDomain(category: Category | CategoryEntity | null): CategoryEntity | null {
    if (!category) {
      return null;
    }

    const base =
      typeof (category as Category).get === 'function'
        ? ((category as Category).get({ plain: true }) as CategoryEntity & {
            books?: Array<{ id: number; title: string }>;
          })
        : (category as CategoryEntity & {
            books?: Array<{ id: number; title: string }>;
          });

    const { books, ...rest } = base;
    const mappedBooks = this.mapBooks(books);

    return {
      ...rest,
      books: mappedBooks,
    };
  }

  private mapBooks(
    books?: Array<{ id: number; title: string }>
  ): Array<{ id: number; title: string }> | undefined {
    if (!books) {
      return undefined;
    }

    return books.map(book => ({
      id: book.id,
      title: book.title,
    }));
  }
}
