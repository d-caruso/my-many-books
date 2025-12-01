// ================================================================
// src/repositories/user/UserRepositoryTypes.ts
// Domain types shared by User repository implementations
// ================================================================

import { UserCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import type { UserEntity } from '../../domain/entities/User';
import {
  ListOptions,
  PaginatedResult as AdapterPaginatedResult,
  QueryOptions,
  SearchFilters,
} from '../interfaces/adapters/RepositoryAdapter';

export type { UserEntity };

export interface UserQueryOptions extends QueryOptions {
  transaction?: import('sequelize').Transaction | null;
}

export interface UserListFilters extends SearchFilters {
  email?: string;
  role?: string;
  isActive?: boolean;
}

export interface UserListOptions extends ListOptions {
  filters?: Partial<UserListFilters>;
  search?: string;
}

export type PaginatedResult<T extends UserEntity = UserEntity> = AdapterPaginatedResult<T>;
export type UserUpdateInput = Partial<UserCreationAttributes>;
