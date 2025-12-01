// ================================================================
// repositories/user/adapters/SequelizeUserAdapter.ts
// Sequelize-backed adapter for the User repository
// ================================================================

import type { Transaction } from 'sequelize';
import { FindAndCountOptions, Op, WhereOptions } from 'sequelize';
import { User } from '@/models/User';
import { UserAttributes, UserCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import {
  PaginatedResult,
  UserEntity,
  UserListFilters,
  UserListOptions,
  UserQueryOptions,
} from '../UserRepositoryTypes';
import { UserRepositoryAdapter } from './UserRepositoryAdapter';
import type { SearchFilters } from '../../interfaces/adapters/RepositoryAdapter';

export class SequelizeUserAdapter implements UserRepositoryAdapter {
  findById(id: number, options?: UserQueryOptions): Promise<UserEntity | null> {
    return User.findByPk(id, this.buildFindOptions(options)).then(user => this.toDomain(user));
  }

  async findByEmail(email: string, options?: UserQueryOptions): Promise<UserEntity | null> {
    const user = await User.findOne({
      where: { email },
      ...this.buildFindOptions(options),
    });
    return this.toDomain(user);
  }

  async list(options?: UserListOptions): Promise<PaginatedResult<UserEntity>> {
    const { limit, offset } = this.getPagination(options);
    const where = this.buildWhereClause(options?.filters, options?.search);

    const query: FindAndCountOptions = {
      where,
      limit,
      offset,
      order: [[options?.orderBy ?? 'creationDate', options?.orderDirection ?? 'DESC']],
    };

    const { rows, count } = await User.findAndCountAll(query);
    const entities = rows.map(row => this.toDomain(row)).filter(Boolean) as UserEntity[];

    return {
      rows: entities,
      total: count,
      limit,
      offset,
    };
  }

  async createModel(
    payload: UserCreationAttributes,
    options?: UserQueryOptions
  ): Promise<UserEntity> {
    const transaction = (options?.transaction ?? null) as Transaction | null;
    const user = await User.create(payload as UserAttributes, {
      transaction,
    });
    return (await this.findById(user.id, options))!;
  }

  async updateModel(
    id: number,
    payload: Partial<UserCreationAttributes>,
    options?: UserQueryOptions
  ): Promise<UserEntity | null> {
    const user = await User.findByPk(id);
    if (!user) {
      return null;
    }

    const transaction = (options?.transaction ?? null) as Transaction | null;
    await user.update(payload, { transaction });
    return this.findById(id, options);
  }

  deleteModel(id: number): Promise<number> {
    return User.destroy({ where: { id } });
  }

  countByRole(role: string): Promise<number> {
    return User.count({ where: { role } });
  }

  buildFindOptions(options?: UserQueryOptions): Parameters<typeof User.findByPk>[1] {
    const query: Parameters<typeof User.findByPk>[1] = {};
    if (options?.transaction) {
      query.transaction = options.transaction as Transaction;
    }
    return query;
  }

  buildListQuery(
    filters: SearchFilters,
    options?: UserListOptions
  ): { query: FindAndCountOptions; limit: number; offset: number } {
    const { limit, offset } = this.getPagination(options);
    const where = this.buildWhereClause(filters as Partial<UserListFilters>, options?.search);
    return {
      query: {
        where,
        limit,
        offset,
        order: [[options?.orderBy ?? 'creationDate', options?.orderDirection ?? 'DESC']],
      },
      limit,
      offset,
    };
  }

  syncAssociations(): Promise<void> {
    return Promise.resolve();
  }

  toDomain(user: User | null): UserEntity | null {
    if (!user) {
      return null;
    }

    const base = user.get({ plain: true }) as UserEntity;
    return base;
  }

  buildPaginatedResult(
    rows: User[],
    total: number,
    limit: number,
    offset: number
  ): PaginatedResult<UserEntity> {
    const entities = rows.map(row => this.toDomain(row)).filter(Boolean) as UserEntity[];

    return {
      rows: entities,
      total,
      limit,
      offset,
    };
  }

  private buildWhereClause(
    filters?: Partial<UserListFilters>,
    search?: string
  ): WhereOptions<User> {
    const where: WhereOptions<User> = {};

    if (filters?.email) {
      Object.assign(where, {
        email: { [Op.iLike]: `%${filters.email}%` },
      });
    }

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (search) {
      Object.assign(where, {
        [Op.or]: [
          { email: { [Op.iLike]: `%${search}%` } },
          { name: { [Op.iLike]: `%${search}%` } },
          { surname: { [Op.iLike]: `%${search}%` } },
        ],
      });
    }

    return where;
  }

  private getPagination(options?: UserListOptions): { limit: number; offset: number } {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    return { limit, offset };
  }
}
