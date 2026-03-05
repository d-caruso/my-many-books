// ================================================================
// repositories/book/adapters/SequelizeBookAdapter.ts
// Sequelize-backed adapter for the Book repository
// ================================================================

import { FindAndCountOptions, FindOptions, IncludeOptions, Op, QueryTypes, WhereOptions } from 'sequelize';
import { Book } from '@/models/Book';
import { Author } from '@/models/Author';
import { Category } from '@/models/Category';
import { BookAuthor } from '@/models/BookAuthor';
import { BookCategory } from '@/models/BookCategory';
import { BookAttributes, BookStatus } from '@/models/interfaces/ModelInterfaces';
import { createModel } from '@/utils/sequelize-helpers';
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
    const transaction = options?.transaction ?? null;
    const { authorIds, categoryIds, ...bookPayload } = payload;
    const book = await createModel(Book, bookPayload, {
      transaction,
    });
    await this.syncAssociations(book, { authorIds, categoryIds });
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

    const transaction = options?.transaction ?? null;
    const { authorIds, categoryIds, ...bookPayload } = payload;
    await book.update(bookPayload, {
      transaction,
    });
    await this.syncAssociations(book, { authorIds, categoryIds });
    return this.findById(id, options);
  }

  deleteModel(id: number): Promise<number> {
    return Book.destroy({ where: { id } });
  }

  buildFindOptions(options?: BookQueryOptions): FindOptions<Book> {
    const include = this.buildInclude(options?.includeAssociations ?? true);
    const query: FindOptions<Book> = {};
    if (options?.transaction) {
      query.transaction = options.transaction;
    }
    if (include) {
      query.include = include;
    }
    return query;
  }

  buildListQuery(
    filters: Partial<BookSearchFilters>,
    options?: BookListOptions
  ): {
    query: FindAndCountOptions<BookAttributes>;
    limit: number;
    offset: number;
  } {
    const { limit, offset } = this.getPagination(options);
    const include = this.buildInclude(options?.includeAssociations ?? true, filters);
    const where = this.buildWhereClause(filters);

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

    type BookRawPlain = BookEntity & {
      authors?: Array<{ id: number; name: string; surname?: string | null }>;
      categories?: Array<{ id: number; name: string }>;
      bookAuthors?: Array<{ author?: { id: number; name: string; surname?: string | null } }>;
      bookCategories?: Array<{ category?: { id: number; name: string } }>;
    };

    const base =
      typeof (book as Book).get === 'function'
        ? ((book as Book).get({ plain: true }) as BookRawPlain)
        : (book as BookRawPlain);

    const { authors, categories, bookAuthors, bookCategories, ...rest } = base;

    const resolvedAuthors = bookAuthors
      ? bookAuthors.map(ba => ba.author).filter((a): a is NonNullable<typeof a> => Boolean(a))
      : authors;

    const resolvedCategories = bookCategories
      ? bookCategories.map(bc => bc.category).filter((c): c is NonNullable<typeof c> => Boolean(c))
      : categories;

    return {
      ...(rest as BookEntity),
      ...(resolvedAuthors ? { authors: this.mapAuthors(resolvedAuthors) } : {}),
      ...(resolvedCategories ? { categories: this.mapCategories(resolvedCategories) } : {}),
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

    // When filtering by author/category, use a JOIN (required: true) so the WHERE clause
    // filters the parent books. Otherwise use separate: true to avoid Cartesian product
    // when loading two independent many-to-many associations simultaneously.
    const authorInclude: IncludeOptions = filters?.authorId
      ? {
          model: Author,
          as: 'authors',
          through: { attributes: [] },
          where: { id: filters.authorId },
          required: true,
        }
      : filters?.author
        ? {
            model: Author,
            as: 'authors',
            through: { attributes: [] },
            where: { name: { [Op.like]: `%${filters.author}%` } },
            required: true,
          }
        : {
            model: BookAuthor,
            as: 'bookAuthors',
            separate: true,
            include: [{ model: Author, as: 'author' }],
          };

    const categoryInclude: IncludeOptions = filters?.categoryId
      ? {
          model: Category,
          as: 'categories',
          through: { attributes: [] },
          where: { id: filters.categoryId },
          required: true,
        }
      : filters?.category
        ? {
            model: Category,
            as: 'categories',
            through: { attributes: [] },
            where: { name: { [Op.like]: `%${filters.category}%` } },
            required: true,
          }
        : {
            model: BookCategory,
            as: 'bookCategories',
            separate: true,
            include: [{ model: Category, as: 'category' }],
          };

    return [authorInclude, categoryInclude];
  }

  private buildWhereClause(filters?: Partial<BookSearchFilters>): WhereOptions<BookAttributes> {
    const conditions: WhereOptions<BookAttributes>[] = [];

    if (filters?.ids?.length) {
      conditions.push({ id: { [Op.in]: filters.ids } });
    }

    if (filters?.userId) {
      conditions.push({ userId: filters.userId });
    }

    if (filters?.searchQuery) {
      conditions.push({
        [Op.or]: [
          { title: { [Op.like]: `%${filters.searchQuery}%` } },
          { isbnCode: { [Op.like]: `%${filters.searchQuery}%` } },
        ],
      });
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

    interface FulltextRow { id: number; relevance_score: number; }
    interface CountRow { total: number; }

    const [results, countResults] = await Promise.all([
      Book.sequelize!.query<FulltextRow>(sql, {
        replacements,
        type: QueryTypes.SELECT,
      }),
      Book.sequelize!.query<CountRow>(countSql, {
        replacements,
        type: QueryTypes.SELECT,
      }),
    ]);

    const relevanceScores = new Map<number, number>();
    const bookIds = results.map((row) => {
      relevanceScores.set(row.id, row.relevance_score);
      return row.id;
    });

    const books = await Book.findAll({
      where: { id: bookIds },
      include: [
        { model: BookAuthor, as: 'bookAuthors', separate: true, include: [{ model: Author, as: 'author' }] },
        { model: BookCategory, as: 'bookCategories', separate: true, include: [{ model: Category, as: 'category' }] },
      ],
    });

    const total = countResults[0]?.total ?? 0;

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
      distinct: true,
      include: [
        { model: BookAuthor, as: 'bookAuthors', separate: true, include: [{ model: Author, as: 'author' }] },
        { model: BookCategory, as: 'bookCategories', separate: true, include: [{ model: Category, as: 'category' }] },
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

    interface PinnedRow { resourceId: number; priority: number; }

    return Book.sequelize!.query<PinnedRow>(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });
  }
}
