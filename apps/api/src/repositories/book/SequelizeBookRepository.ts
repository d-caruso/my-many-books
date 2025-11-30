// ================================================================
// src/repositories/book/SequelizeBookRepository.ts
// Sequelize-backed implementation of the Book repository contract
// ================================================================

import { injectable } from 'inversify';
import { FindAndCountOptions, FindOptions, IncludeOptions, Op, WhereOptions } from 'sequelize';
import { Book } from '@/models/Book';
import { Author } from '@/models/Author';
import { Category } from '@/models/Category';
import { BookAttributes, BookCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import {
  BookAssociationInput,
  BookEntity,
  BookListOptions,
  BookQueryOptions,
  BookSearchFilters,
  PaginatedResult,
} from './BookRepository.types';
import { IBookRepository } from './IBookRepository';

@injectable()
export class SequelizeBookRepository implements IBookRepository {
  async findById(id: number, options?: BookQueryOptions): Promise<BookEntity | null> {
    const book = await Book.findByPk(id, this.buildFindOptions(options));
    return this.toDomain(book);
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
    const { limit, offset } = this.getPagination(options);
    const where = this.buildWhereClause({ ...(options?.filters ?? {}), userId });
    const include = this.buildInclude(options?.includeAssociations ?? true, options?.filters);

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

    const { rows, count } = await Book.findAndCountAll(query);

    return this.buildPaginatedResult(rows, count, limit, offset);
  }

  async search(
    filters: BookSearchFilters,
    options?: BookListOptions
  ): Promise<PaginatedResult<BookEntity>> {
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

    const { rows, count } = await Book.findAndCountAll(query);

    return this.buildPaginatedResult(rows, count, limit, offset);
  }

  async create(
    payload: BookCreationAttributes,
    associations?: BookAssociationInput,
    options?: BookQueryOptions
  ): Promise<BookEntity> {
    const transaction = options?.transaction;
    const book = await Book.create(payload as BookAttributes, { transaction: transaction ?? null });
    await this.syncAssociations(book, associations);
    return (await this.findById(book.id, options))!;
  }

  async update(
    id: number,
    payload: Partial<BookCreationAttributes>,
    associations?: BookAssociationInput,
    options?: BookQueryOptions
  ): Promise<BookEntity | null> {
    const book = await Book.findByPk(id);
    if (!book) {
      return null;
    }

    await book.update(payload as Partial<BookAttributes>, {
      transaction: options?.transaction ?? null,
    });
    await this.syncAssociations(book, associations);
    return this.findById(id, options);
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await Book.destroy({ where: { id } });
    return deleted > 0;
  }

  // ===== Helpers ==========================================================

  private buildFindOptions(options?: BookQueryOptions): FindOptions<Book> {
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

  private buildPaginatedResult(
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

  private async syncAssociations(book: Book, associations?: BookAssociationInput): Promise<void> {
    if (!associations) {
      return;
    }

    if (associations.authorIds) {
      const authors = await Author.findAll({ where: { id: associations.authorIds } });
      await book.setAuthors(authors);
    }

    if (associations.categoryIds) {
      const categories = await Category.findAll({ where: { id: associations.categoryIds } });
      await book.setCategories(categories);
    }
  }

  private toDomain(book: Book | BookEntity | null): BookEntity | null {
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
}
