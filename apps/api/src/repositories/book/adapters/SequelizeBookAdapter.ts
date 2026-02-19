// ================================================================
// repositories/book/adapters/SequelizeBookAdapter.ts
// Sequelize-backed adapter for the Book repository
// ================================================================

import type { Transaction } from 'sequelize';
import { FindAndCountOptions, FindOptions, IncludeOptions, Op, WhereOptions } from 'sequelize';
import { Book } from '@/models/Book';
import { Author } from '@/models/Author';
import { Category } from '@/models/Category';
import { BookAttributes, BookStatus } from '@/models/interfaces/ModelInterfaces';
import {
  BookAssociationInput,
  BookCreationInput,
  BookEntity,
  BookListOptions,
  BookQueryOptions,
  BookSearchFilters,
  PaginatedResult,
} from '../BookRepositoryTypes';
import { BookRepositoryAdapter } from './BookRepositoryAdapter';
import type { SearchFilters } from '../../interfaces/adapters/RepositoryAdapter';

export class SequelizeBookAdapter implements BookRepositoryAdapter {
  findById(id: number, options?: BookQueryOptions): Promise<BookEntity | null> {
    return Book.findByPk(id, this.buildFindOptions(options)).then(book => this.toDomain(book));
  }

  async findUserBookById(
    id: number,
    userId: number,
    options?: BookQueryOptions
  ): Promise<BookEntity | null> {
    const book = await Book.findOne({
      ...this.buildFindOptions(options),
      where: { id, userId },
    });
    return this.toDomain(book);
  }

  async findByIsbnCode(
    isbnCode: string,
    userId?: number,
    options?: BookQueryOptions
  ): Promise<BookEntity | null> {
    const where: WhereOptions<BookAttributes> = { isbnCode };
    if (userId) {
      Object.assign(where, { userId });
    }

    const book = await Book.findOne({
      ...this.buildFindOptions(options),
      where,
    });
    return this.toDomain(book);
  }

  async listUserBooks(
    userId: number,
    options?: BookListOptions
  ): Promise<PaginatedResult<BookEntity>> {
    const filterSet: BookSearchFilters = { ...(options?.filters ?? {}), userId };
    const { limit, offset, query } = this.buildListQuery(filterSet, options);
    const { rows, count } = await Book.findAndCountAll(query);
    return this.buildPaginatedResult(rows, count, limit, offset);
  }

  async search(
    filters: BookSearchFilters,
    options?: BookListOptions
  ): Promise<PaginatedResult<BookEntity>> {
    const { limit, offset, query } = this.buildListQuery(filters, options);
    const { rows, count } = await Book.findAndCountAll(query);
    return this.buildPaginatedResult(rows, count, limit, offset);
  }

  countUserBooks(userId: number, status?: BookStatus): Promise<number> {
    const where: WhereOptions<BookAttributes> = { userId };
    if (status) {
      where.status = status;
    }
    return Book.count({ where });
  }

  async findRecentUserBooks(userId: number, limit: number): Promise<BookEntity[]> {
    const recentBooks = await Book.findAll({
      where: { userId },
      order: [['creationDate', 'DESC']],
      limit,
    });

    return recentBooks
      .map(book => this.toDomain(book))
      .filter((entity): entity is BookEntity => Boolean(entity));
  }

  async createModel(payload: BookCreationInput, options?: BookQueryOptions): Promise<BookEntity> {
    const transaction = (options?.transaction as Transaction | null) ?? null;
    const book = await Book.create(payload as unknown as BookAttributes, {
      transaction,
    });
    await this.syncAssociations(book, payload);
    return (await this.findById(book.id, options))!;
  }

  async updateModel(
    id: number,
    payload: Partial<BookCreationInput>,
    options?: BookQueryOptions
  ): Promise<BookEntity | null> {
    const book = await Book.findByPk(id);
    if (!book) {
      return null;
    }

    const transaction = (options?.transaction as Transaction | null) ?? null;
    await book.update(payload as Partial<BookAttributes>, {
      transaction,
    });
    await this.syncAssociations(book, payload);
    return this.findById(id, options);
  }

  deleteModel(id: number): Promise<number> {
    return Book.destroy({ where: { id } });
  }

  buildFindOptions(options?: BookQueryOptions): FindOptions<Book> {
    const include = this.buildInclude(options?.includeAssociations ?? true);
    const query: FindOptions<Book> = {};
    if (options?.transaction) {
      query.transaction = options.transaction as Transaction;
    }
    if (include) {
      query.include = include;
    }
    return query;
  }

  buildListQuery(
    filters: SearchFilters,
    options?: BookListOptions
  ): {
    query: FindAndCountOptions<BookAttributes>;
    limit: number;
    offset: number;
  } {
    const typedFilters = (filters as Partial<BookSearchFilters>) || {};
    const { limit, offset } = this.getPagination(options);
    const include = this.buildInclude(options?.includeAssociations ?? true, typedFilters);
    const where = this.buildWhereClause(typedFilters);

    const query: FindAndCountOptions<BookAttributes> = {
      where,
      limit,
      offset,
      order: this.buildOrderClause(options),
      distinct: true,
    };
    if (include) {
      query.include = include;
    }

    return { query, limit, offset };
  }

  async syncAssociations(
    book: Book,
    associations?: BookAssociationInput | Partial<BookCreationInput>
  ): Promise<void> {
    if (!associations) {
      return;
    }

    if (associations.authorIds !== undefined) {
      const authors = associations.authorIds.length > 0
        ? await Author.findAll({ where: { id: associations.authorIds } })
        : [];
      await book.setAuthors(authors);
    }

    if (associations.categoryIds !== undefined) {
      const categories = associations.categoryIds.length > 0
        ? await Category.findAll({ where: { id: associations.categoryIds } })
        : [];
      await book.setCategories(categories);
    }
  }

  toDomain(book: Book | BookEntity | null): BookEntity | null {
    if (!book) {
      return null;
    }

    const base =
      typeof (book as Book).get === 'function'
        ? ((book as Book).get({ plain: true }) as BookEntity & {
            authors?: Array<{ id: number; name: string; surname?: string }>;
            categories?: Array<{ id: number; name: string }>;
          })
        : (book as BookEntity & {
            authors?: Array<{ id: number; name: string; surname?: string }>;
            categories?: Array<{ id: number; name: string }>;
          });

    const { authors, categories, ...rest } = base;
    const authorsMapped = this.mapAuthors(authors);
    const categoriesMapped = this.mapCategories(categories);

    return {
      ...(rest as BookEntity),
      ...(authorsMapped ? { authors: authorsMapped } : {}),
      ...(categoriesMapped ? { categories: categoriesMapped } : {}),
    };
  }

  buildPaginatedResult(
    rows: Book[],
    total: number,
    limit: number,
    offset: number
  ): PaginatedResult<BookEntity> {
    return {
      rows: rows.map(row => this.toDomain(row)!),
      total,
      limit,
      offset,
    };
  }

  // ===== Helpers ==========================================================

  private buildInclude(
    includeAssociations: boolean,
    filters?: Partial<BookSearchFilters>
  ): IncludeOptions[] | undefined {
    if (!includeAssociations) {
      return undefined;
    }

    const include: IncludeOptions[] = [
      {
        model: Author,
        as: 'authors',
        through: { attributes: [] },
        ...(filters?.author
          ? {
              where: {
                name: { [Op.like]: `%${filters.author}%` },
              },
              required: true,
            }
          : {}),
      },
      {
        model: Category,
        as: 'categories',
        through: { attributes: [] },
        ...(filters?.category
          ? {
              where: {
                name: { [Op.like]: `%${filters.category}%` },
              },
              required: true,
            }
          : {}),
      },
    ];

    return include;
  }

  private buildWhereClause(filters?: Partial<BookSearchFilters>): WhereOptions<BookAttributes> {
    const conditions: WhereOptions<BookAttributes>[] = [];

    if (filters?.userId) {
      conditions.push({ userId: filters.userId });
    }

    if (filters?.title) {
      conditions.push({ title: { [Op.like]: `%${filters.title}%` } });
    }

    if (filters?.isbnCode) {
      conditions.push({ isbnCode: { [Op.like]: `%${filters.isbnCode}%` } });
    }

    if (filters?.status) {
      conditions.push({ status: filters.status });
    }

    if (filters?.notes) {
      conditions.push({ notes: { [Op.like]: `%${filters.notes}%` } });
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

  private buildOrderClause(options?: BookListOptions): Array<[string, string]> {
    if (!options?.orderBy) {
      return [['title', 'ASC']];
    }

    return [[options.orderBy, options.orderDirection ?? 'ASC']];
  }

  private getPagination(options?: BookListOptions): { limit: number; offset: number } {
    const limit = Math.min(options?.limit ?? 20, 100);
    const offset = Math.max(options?.offset ?? 0, 0);
    return { limit, offset };
  }

  private mapAuthors(
    authors?: Array<{ id: number; name: string; surname?: string | null }>
  ): BookEntity['authors'] {
    if (!authors) {
      return undefined;
    }

    return authors.map(author => {
      const normalized: { id: number; name: string; surname?: string } = {
        id: author.id,
        name: author.name,
      };
      if (author.surname !== undefined && author.surname !== null) {
        normalized.surname = author.surname;
      }
      return normalized;
    });
  }

  private mapCategories(
    categories?: Array<{ id: number; name: string }>
  ): BookEntity['categories'] {
    if (!categories) {
      return undefined;
    }

    return categories.map(category => ({
      id: category.id,
      name: category.name,
    }));
  }

  // ===== FULLTEXT Search Methods ==========================================

  /**
   * Search using MySQL FULLTEXT index with MATCH...AGAINST
   * Returns books with relevance scores
   */
  async searchFulltext(
    query: string,
    userId?: number,
    limit = 20,
    offset = 0
  ): Promise<{ rows: BookEntity[]; total: number; relevanceScores: Map<number, number> }> {
    const where: WhereOptions<BookAttributes> = {};
    if (userId) {
      where.userId = userId;
    }

    // Execute FULLTEXT search with relevance scoring
    const sql = `
      SELECT
        b.*,
        MATCH(b.title, b.notes) AGAINST(:searchQuery IN NATURAL LANGUAGE MODE) as relevance_score
      FROM books b
      ${userId ? 'WHERE b.user_id = :userId AND' : 'WHERE'}
        MATCH(b.title, b.notes) AGAINST(:searchQuery IN NATURAL LANGUAGE MODE)
      ORDER BY relevance_score DESC
      LIMIT :limit OFFSET :offset
    `;

    const countSql = `
      SELECT COUNT(*) as total
      FROM books b
      ${userId ? 'WHERE b.user_id = :userId AND' : 'WHERE'}
        MATCH(b.title, b.notes) AGAINST(:searchQuery IN NATURAL LANGUAGE MODE)
    `;

    const replacements: Record<string, unknown> = {
      searchQuery: query,
      limit,
      offset,
    };
    if (userId) {
      replacements['userId'] = userId;
    }

    const [results, countResults] = await Promise.all([
      Book.sequelize!.query(sql, {
        replacements,
        type: 'SELECT' as any,
      }),
      Book.sequelize!.query(countSql, {
        replacements,
        type: 'SELECT' as any,
      }),
    ]);

    const relevanceScores = new Map<number, number>();
    const bookIds = (results as any[]).map((row: any) => {
      relevanceScores.set(row.id, row.relevance_score);
      return row.id;
    });

    const books = await Book.findAll({
      where: { id: bookIds },
      include: [
        { model: Author, as: 'authors' },
        { model: Category, as: 'categories' },
      ],
    });

    const total = (countResults as any[])[0]?.total || 0;

    return {
      rows: books.map(book => this.toDomain(book)!),
      total,
      relevanceScores,
    };
  }

  /**
   * Search using LIKE operator (fallback when FULLTEXT is disabled)
   */
  async searchLike(
    query: string,
    userId?: number,
    limit = 20,
    offset = 0
  ): Promise<{ rows: BookEntity[]; total: number }> {
    const whereConditions: WhereOptions<BookAttributes>[] = [
      {
        [Op.or]: [
          { title: { [Op.like]: `%${query}%` } },
          { notes: { [Op.like]: `%${query}%` } },
        ],
      },
    ];

    if (userId) {
      whereConditions.push({ userId });
    }

    const where: WhereOptions<BookAttributes> =
      whereConditions.length > 1 ? { [Op.and]: whereConditions } : whereConditions[0]!;

    const { rows, count } = await Book.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: Author, as: 'authors' },
        { model: Category, as: 'categories' },
      ],
      order: [['title', 'ASC']],
    });

    return {
      rows: rows.map(book => this.toDomain(book)!),
      total: count,
    };
  }

  /**
   * Find pinned results for books
   */
  async findPinned(userId?: number): Promise<Array<{ resourceId: number; priority: number }>> {
    const sql = `
      SELECT
        spr.resource_id as resourceId,
        spr.priority
      FROM search_pinned_results spr
      INNER JOIN books b ON spr.resource_id = b.id
      WHERE spr.resource_type = 'book'
        AND spr.active = true
        ${userId ? 'AND b.user_id = :userId' : ''}
      ORDER BY spr.priority ASC
    `;

    const replacements: Record<string, unknown> = {};
    if (userId) {
      replacements['userId'] = userId;
    }

    const results = await Book.sequelize!.query(sql, {
      replacements,
      type: 'SELECT' as any,
    });

    return results as unknown as Array<{ resourceId: number; priority: number }>;
  }
}
