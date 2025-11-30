// ================================================================
// src/repositories/user/SequelizeUserRepository.ts
// Sequelize-backed implementation of the User repository contract
// ================================================================

import { injectable } from 'inversify';
import { FindAndCountOptions, Op, WhereOptions } from 'sequelize';
import { User } from '@/models/User';
import { UserAttributes, UserCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import {
  PaginatedResult,
  UserEntity,
  UserListFilters,
  UserListOptions,
  UserQueryOptions,
  UserUpdateInput,
} from './UserRepository.types';
import { IUserRepository } from './IUserRepository';

@injectable()
export class SequelizeUserRepository implements IUserRepository {
  async findById(id: number, options?: UserQueryOptions): Promise<UserEntity | null> {
    const user = await User.findByPk(id, this.buildFindOptions(options));
    return this.toDomain(user);
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
    const where = this.buildWhereClause(options?.filters);

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

  async create(payload: UserCreationAttributes, options?: UserQueryOptions): Promise<UserEntity> {
    const user = await User.create(payload as UserAttributes, {
      transaction: options?.transaction ?? null,
    });
    return (await this.findById(user.id, options))!;
  }

  async update(
    id: number,
    payload: UserUpdateInput,
    options?: UserQueryOptions
  ): Promise<UserEntity | null> {
    const user = await User.findByPk(id);
    if (!user) {
      return null;
    }

    await user.update(payload, { transaction: options?.transaction ?? null });
    return this.findById(id, options);
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await User.destroy({ where: { id } });
    return deleted > 0;
  }

  private buildFindOptions(options?: UserQueryOptions) {
    const query: Parameters<typeof User.findByPk>[1] = {};
    if (options?.transaction) {
      query.transaction = options.transaction;
    }
    return query;
  }

  private buildWhereClause(filters?: Partial<UserListFilters>): WhereOptions<User> {
    const where: WhereOptions<User> = {};

    if (filters?.email) {
      where.email = { [Op.iLike]: `%${filters.email}%` } as any;
    }

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return where;
  }

  private getPagination(options?: UserListOptions): { limit: number; offset: number } {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    return { limit, offset };
  }

  private toDomain(user: User | null): UserEntity | null {
    if (!user) {
      return null;
    }

    const base = user.get({ plain: true }) as UserEntity;
    return base;
  }
}
