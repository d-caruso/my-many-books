// ================================================================
// repositories/author/adapters/SequelizeAuthorAdapter.ts
// Sequelize-backed adapter for the Author repository
// ================================================================

import { FindAndCountOptions, FindOptions, IncludeOptions, Op, QueryTypes, WhereOptions, fn, col, where as sequelizeWhere } from 'sequelize';
import { SORT_DIRECTIONS } from '@my-many-books/shared-types';
import { Author } from '@/models/Author';
import { Book } from '@/models/Book';
import { createModel } from '@/utils/sequelize-helpers';
import {
  AuthorCreationInput,
  AuthorEntity,
  AuthorListFilters,
  AuthorListOptions,
  AuthorQueryOptions,
  PaginatedResult,
} from '../AuthorRepositoryTypes';
import { AuthorRepositoryAdapter } from './AuthorRepositoryAdapter';

export class SequelizeAuthorAdapter implements AuthorRepositoryAdapter {
  findById(id: number, options?: AuthorQueryOptions): Promise<AuthorEntity | null> {
    return Author.findByPk(id, this.buildFindOptions(options)).then(author =>
      this.toDomain(author)
    );
  }

  async findUserAuthorById(
    id: number,
    userId: number,
    options?: AuthorQueryOptions
  ): Promise<AuthorEntity | null> {
    const author = await Author.findOne({
      ...this.buildFindOptions(options),
      where: { id, userId },
    });
    return this.toDomain(author);
  }

  async findByNameAndSurname(
    name: string,
    surname: string,
    userId: number,
    options?: AuthorQueryOptions
  ): Promise<AuthorEntity | null> {
    const author = await Author.findOne({
      ...this.buildFindOptions(options),
      where: {
        [Op.and]: [
          sequelizeWhere(fn('LOWER', col('name')), name.toLowerCase()),
          sequelizeWhere(fn('LOWER', col('surname')), surname.toLowerCase()),
          { userId },
        ],
      },
    });
    return this.toDomain(author);
  }

  async list(options?: AuthorListOptions): Promise<PaginatedResult<AuthorEntity>> {
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

    const { rows, count } = await Author.findAndCountAll(query);
    return this.buildPaginatedResult(rows, count, limit, offset);
  }

  async searchByQuery(
    term: string,
    userId: number,
    limit = 20
  ): Promise<Array<Pick<AuthorEntity, 'id' | 'name' | 'surname' | 'nationality'>>> {
    const normalized = term.trim();
    if (normalized.length < 2) {
      return [];
    }

    const authors = await Author.findAll({
      where: {
        userId,
        [Op.or]: [
          { name: { [Op.like]: `%${normalized}%` } },
          { surname: { [Op.like]: `%${normalized}%` } },
        ],
      },
      attributes: ['id', 'name', 'surname', 'nationality', 'creationDate', 'updateDate'],
      order: [
        ['surname', 'ASC'],
        ['name', 'ASC'],
      ],
      limit,
    });

    return authors.map(author => author.get({ plain: true }));
  }

  async createModel(
    payload: AuthorCreationInput,
    options?: AuthorQueryOptions
  ): Promise<AuthorEntity> {
    const record = await createModel(Author, payload, {
      transaction: options?.transaction ?? null,
    });
    return (await this.findById(record.id, options))!;
  }

  async updateModel(
    id: number,
    payload: Partial<AuthorCreationInput>,
    options?: AuthorQueryOptions
  ): Promise<AuthorEntity | null> {
    const author = await Author.findByPk(id);
    if (!author) {
      return null;
    }

    await author.update(payload, {
      transaction: options?.transaction ?? null,
    });
    return this.findById(id, options);
  }

  deleteModel(id: number): Promise<number> {
    return Author.destroy({ where: { id } });
  }

  countBooks(authorId: number): Promise<number> {
    return Book.count({
      include: [
        {
          model: Author,
          where: { id: authorId },
          required: true,
        },
      ],
      distinct: true,
    });
  }

  buildFindOptions(options?: AuthorQueryOptions): FindOptions<Author> {
    const include = this.buildIncludeClause(options?.includeBooks);
    const query: FindOptions<Author> = {};
    if (options?.transaction) {
      query.transaction = options.transaction;
    }
    if (include) {
      query.include = include;
    }
    return query;
  }

  buildListQuery(
    filters: Partial<AuthorListFilters>,
    options?: AuthorListOptions
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

  toDomain(author: Author | AuthorEntity | null): AuthorEntity | null {
    if (!author) {
      return null;
    }

    if (typeof (author as Author).get === 'function') {
      return (author as Author).get({ plain: true }) as AuthorEntity;
    }

    return author as AuthorEntity;
  }

  buildPaginatedResult(
    rows: Author[],
    total: number,
    limit: number,
    offset: number
  ): PaginatedResult<AuthorEntity> {
    const entities = rows
      .map(row => this.toDomain(row))
      .filter((entity): entity is AuthorEntity => Boolean(entity));

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
        through: { attributes: [] },
      },
    ];
  }

  private buildWhereClause(filters?: Partial<AuthorListFilters>): WhereOptions {
    const conditions: WhereOptions[] = [];

    if (filters?.userId !== undefined) {
      conditions.push({ userId: filters.userId });
    }

    if (filters?.name && filters?.surname) {
      conditions.push({ name: { [Op.like]: `%${filters.name}%` } });
      conditions.push({ surname: { [Op.like]: `%${filters.surname}%` } });
    } else if (filters?.name) {
      conditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${filters.name}%` } },
          { surname: { [Op.like]: `%${filters.name}%` } },
        ],
      });
    } else if (filters?.surname) {
      conditions.push({ surname: { [Op.like]: `%${filters.surname}%` } });
    }

    if (filters?.nationality) {
      conditions.push({ nationality: { [Op.like]: `%${filters.nationality}%` } });
    }

    // Incremental sync support for mobile clients
    if (filters?.updatedSince) {
      const since = new Date(filters.updatedSince);
      if (!isNaN(since.getTime())) {
        conditions.push({ updateDate: { [Op.gt]: since } });
      }
    }

    return conditions.length > 0 ? { [Op.and]: conditions } : {};
  }

  private buildOrderClause(options?: AuthorListOptions): Array<[string, string]> {
    if (!options?.orderBy) {
      return [
        ['surname', 'ASC'],
        ['name', 'ASC'],
      ];
    }

    return [[options.orderBy, options.orderDirection ?? SORT_DIRECTIONS.ASC]];
  }

  private getPagination(options?: AuthorListOptions): { limit: number; offset: number } {
    const limit = Math.min(options?.limit ?? 20, 100);
    const offset = Math.max(options?.offset ?? 0, 0);
    return { limit, offset };
  }

  /**
   * Search using MySQL FULLTEXT
   * Searches author name and surname fields
   */
  async searchFulltext(
    query: string,
    userId?: number,
    limit = 20,
    offset = 0
  ): Promise<{
    rows: AuthorEntity[];
    total: number;
    relevanceScores: Map<number, number>;
  }> {
    const whereConditions: WhereOptions[] = [
      {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { surname: { [Op.like]: `%${query}%` } },
        ],
      },
    ];

    if (userId) {
      whereConditions.push({ userId });
    }

    // FULLTEXT search on name and surname
    const result = await Author.findAndCountAll({
      where: { [Op.and]: whereConditions },
      limit,
      offset,
      order: [['name', 'ASC'], ['surname', 'ASC']],
      raw: true,
    });

    // Calculate relevance scores
    const relevanceScores = new Map<number, number>();
    result.rows.forEach((author) => {
      const nameMatch = author.name.toLowerCase().includes(query.toLowerCase());
      const surnameMatch = author.surname.toLowerCase().includes(query.toLowerCase());
      let score = 0;
      if (nameMatch) score += 50;
      if (surnameMatch) score += 50;
      relevanceScores.set(author.id, score);
    });

    const entities = result.rows
      .map(row => this.toDomain(row))
      .filter((entity): entity is AuthorEntity => Boolean(entity));

    return {
      rows: entities,
      total: result.count,
      relevanceScores,
    };
  }

  /**
   * Search using LIKE fallback
   */
  async searchLike(
    query: string,
    userId?: number,
    limit = 20,
    offset = 0
  ): Promise<{
    rows: AuthorEntity[];
    total: number;
  }> {
    const whereConditions: WhereOptions[] = [
      {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { surname: { [Op.like]: `%${query}%` } },
        ],
      },
    ];

    if (userId) {
      whereConditions.push({ userId });
    }

    const result = await Author.findAndCountAll({
      where: { [Op.and]: whereConditions },
      limit,
      offset,
      order: [['surname', 'ASC'], ['name', 'ASC']],
    });

    const entities = result.rows
      .map(row => this.toDomain(row))
      .filter((entity): entity is AuthorEntity => Boolean(entity));

    return {
      rows: entities,
      total: result.count,
    };
  }

  /**
   * Find pinned authors for search results
   */
  async findPinned(userId?: number): Promise<Array<{
    resourceId: number;
    priority: number;
  }>> {
    const sql = `
      SELECT
        spr.resource_id as resourceId,
        spr.priority
      FROM search_pinned_results spr
      INNER JOIN authors a ON spr.resource_id = a.id
      WHERE spr.resource_type = 'author'
        AND spr.active = true
        ${userId ? 'AND a.user_id = :userId' : ''}
      ORDER BY spr.priority ASC
    `;

    const replacements: Record<string, unknown> = {};
    if (userId) {
      replacements['userId'] = userId;
    }

    interface PinnedRow { resourceId: number; priority: number; }

    return Author.sequelize!.query<PinnedRow>(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });
  }
}
