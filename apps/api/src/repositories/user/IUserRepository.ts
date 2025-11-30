// ================================================================
// src/repositories/user/IUserRepository.ts
// Contract for user persistence operations
// ================================================================

import { UserCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import {
  PaginatedResult,
  UserEntity,
  UserListOptions,
  UserQueryOptions,
  UserUpdateInput,
} from './UserRepository.types';

export interface IUserRepository {
  findById(id: number, options?: UserQueryOptions): Promise<UserEntity | null>;
  findByEmail(email: string, options?: UserQueryOptions): Promise<UserEntity | null>;
  list(options?: UserListOptions): Promise<PaginatedResult<UserEntity>>;
  create(payload: UserCreationAttributes, options?: UserQueryOptions): Promise<UserEntity>;
  update(id: number, payload: UserUpdateInput, options?: UserQueryOptions): Promise<UserEntity | null>;
  delete(id: number): Promise<boolean>;
  countByRole(role: string): Promise<number>;
}
