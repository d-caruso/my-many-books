// ================================================================
// repositories/user/adapters/UserRepositoryAdapter.ts
// Contract for user repository adapters
// ================================================================

import {
  PaginatedResult,
  UserEntity,
  UserListFilters,
  UserListOptions,
  UserQueryOptions,
} from '../UserRepositoryTypes';
import { UserCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import { RepositoryAdapter } from '../../interfaces/adapters/RepositoryAdapter';

export interface UserRepositoryAdapter
  extends RepositoryAdapter<
    UserEntity,
    UserCreationAttributes,
    Record<string, never>,
    UserQueryOptions,
    UserListOptions,
    UserListFilters
  > {
  findById(id: number, options?: UserQueryOptions): Promise<UserEntity | null>;
  findByEmail(email: string, options?: UserQueryOptions): Promise<UserEntity | null>;
  list(options?: UserListOptions): Promise<PaginatedResult<UserEntity>>;
  countByRole(role: string): Promise<number>;
}
