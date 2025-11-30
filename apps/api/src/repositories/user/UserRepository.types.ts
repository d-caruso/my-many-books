// ================================================================
// src/repositories/user/UserRepository.types.ts
// Domain types shared by User repository implementations
// ================================================================

import { UserAttributes, UserCreationAttributes } from '@/models/interfaces/ModelInterfaces';

export interface UserQueryOptions {
  transaction?: import('sequelize').Transaction;
}

export interface UserListFilters {
  email?: string;
  role?: string;
  isActive?: boolean;
}

export interface UserListOptions extends UserQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: Partial<UserListFilters>;
  search?: string;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
}

export type UserEntity = UserAttributes;
export type UserUpdateInput = Partial<UserCreationAttributes>;
