// ================================================================
// repositories/user/adapters/SequelizeUserAdapter.ts
// Sequelize-backed adapter for the User repository
// ================================================================

import { FindAndCountOptions, Op, WhereOptions } from 'sequelize';
import { User } from '@/models/User';
import { UserCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import { createModel } from '@/utils/sequelize-helpers';
import {
  PaginatedResult,
  UserEntity,
  UserListFilters,
  UserListOptions,
  UserQueryOptions,
} from '../UserRepositoryTypes';
import { UserRepositoryAdapter } from './UserRepositoryAdapter';

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
    const entities = rows.map(row => this.toDomain(row)).filter((e): e is UserEntity => e !== null);

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
    const transaction = options?.transaction ?? null;
    const user = await createModel(User, payload, {
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

    const transaction = options?.transaction ?? null;
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
      query.transaction = options.transaction;
    }
    return query;
  }

  buildListQuery(
    filters: Partial<UserListFilters>,
    options?: UserListOptions
  ): { query: FindAndCountOptions; limit: number; offset: number } {
    const { limit, offset } = this.getPagination(options);
    const where = this.buildWhereClause(filters, options?.search);
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
    const entities = rows.map(row => this.toDomain(row)).filter((e): e is UserEntity => e !== null);

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
        email: { [Op.like]: `%${filters.email}%` },
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
          { email: { [Op.like]: `%${search}%` } },
          { name: { [Op.like]: `%${search}%` } },
          { surname: { [Op.like]: `%${search}%` } },
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
