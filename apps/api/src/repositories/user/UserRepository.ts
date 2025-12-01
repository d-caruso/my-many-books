// ================================================================
// src/repositories/user/UserRepository.ts
// Adapter-driven implementation of the User repository contract
// ================================================================

import { injectable } from 'inversify';
import { Repository as UserRepositoryContract } from './Repository';
import {
  PaginatedResult,
  UserEntity,
  UserListOptions,
  UserQueryOptions,
  UserUpdateInput,
} from './UserRepositoryTypes';
import { UserRepositoryAdapter } from './adapters/UserRepositoryAdapter';
import { getUserRepositoryAdapter } from './adapters/UserRepositoryAdapterFactory';
import { UserCreationAttributes } from '@/models/interfaces/ModelInterfaces';

@injectable()
export class UserRepository implements UserRepositoryContract {
  constructor(private readonly adapter: UserRepositoryAdapter = getUserRepositoryAdapter()) {}

  findById(id: number, options?: UserQueryOptions): Promise<UserEntity | null> {
    return this.adapter.findById(id, options);
  }

  findByEmail(email: string, options?: UserQueryOptions): Promise<UserEntity | null> {
    return this.adapter.findByEmail(email, options);
  }

  list(options?: UserListOptions): Promise<PaginatedResult<UserEntity>> {
    return this.adapter.list(options);
  }

  create(payload: UserCreationAttributes, options?: UserQueryOptions): Promise<UserEntity> {
    return this.adapter.createModel(payload, options);
  }

  update(
    id: number,
    payload: UserUpdateInput,
    options?: UserQueryOptions
  ): Promise<UserEntity | null> {
    return this.adapter.updateModel(id, payload, options);
  }

  async delete(id: number): Promise<boolean> {
    return (await this.adapter.deleteModel(id)) > 0;
  }

  countByRole(role: string): Promise<number> {
    return this.adapter.countByRole(role);
  }
}
