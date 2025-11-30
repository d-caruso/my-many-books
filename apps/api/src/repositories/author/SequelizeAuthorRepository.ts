// ================================================================
// src/repositories/author/SequelizeAuthorRepository.ts
// Sequelize-backed implementation of the Author repository contract
// ================================================================

import { injectable } from 'inversify';
import { FindAndCountOptions, FindOptions, IncludeOptions, Op, WhereOptions } from 'sequelize';
import { Author } from '@/models/Author';
import { Book } from '@/models/Book';
import { AuthorAttributes, AuthorCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import {
  AuthorEntity,
  AuthorListFilters,
  AuthorListOptions,
  AuthorQueryOptions,
  AuthorUpdateInput,
  PaginatedResult,
} from './AuthorRepositoryTypes';
import { IAuthorRepository } from './IAuthorRepository';

@injectable()
export class SequelizeAuthorRepository implements IAuthorRepository {
  async findById(id: number, options?: AuthorQueryOptions): Promise<AuthorEntity | null> {
    const author = await Author.findByPk(id, this.buildFindOptions(options));
    return this.toDomain(author);
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
      where: { name, surname, userId },
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

  async create(
    payload: AuthorCreationAttributes,
    options?: AuthorQueryOptions
  ): Promise<AuthorEntity> {
    const author = await Author.create(payload as AuthorAttributes, {
      transaction: options?.transaction ?? null,
    });
    return (await this.findById(author.id, options))!;
  }

  async update(
    id: number,
    payload: AuthorUpdateInput,
    options?: AuthorQueryOptions
  ): Promise<AuthorEntity | null> {
    const author = await Author.findByPk(id);
    if (!author) {
      return null;
    }

    await author.update(payload, { transaction: options?.transaction ?? null });
    return this.findById(id, options);
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await Author.destroy({ where: { id } });
    return deleted > 0;
  }

  async countBooks(authorId: number): Promise<number> {
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

  // ===== Helpers ==========================================================

  private buildFindOptions(options?: AuthorQueryOptions): FindOptions<Author> {
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
      conditions.push({ name: { [Op.iLike]: `%${filters.name}%` } });
      conditions.push({ surname: { [Op.iLike]: `%${filters.surname}%` } });
    } else if (filters?.name) {
      conditions.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${filters.name}%` } },
          { surname: { [Op.iLike]: `%${filters.name}%` } },
        ],
      });
    } else if (filters?.surname) {
      conditions.push({ surname: { [Op.iLike]: `%${filters.surname}%` } });
    }

    if (filters?.nationality) {
      conditions.push({ nationality: { [Op.iLike]: `%${filters.nationality}%` } });
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

    return [[options.orderBy, options.orderDirection ?? 'ASC']];
  }

  private getPagination(options?: AuthorListOptions): { limit: number; offset: number } {
    const limit = Math.min(options?.limit ?? 20, 100);
    const offset = Math.max(options?.offset ?? 0, 0);
    return { limit, offset };
  }

  private buildPaginatedResult(
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

  private toDomain(author: Author | AuthorEntity | null): AuthorEntity | null {
    if (!author) {
      return null;
    }

    if (typeof (author as Author).get === 'function') {
      return (author as Author).get({ plain: true }) as AuthorEntity;
    }

    return author as AuthorEntity;
  }
}
