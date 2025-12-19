/**
 * User API client - platform agnostic
 */

import { BaseApiClient } from './base-client';
import {
  User,
  UserSchema,
  AuthSession,
  AuthSessionSchema,
  RefreshTokenResponse,
  RefreshTokenSchema,
} from '@my-many-books/shared-types';

export class UserApi extends BaseApiClient {
  async getCurrentUser(): Promise<User> {
    const response = await this.get<unknown>('/users');
    return UserSchema.parse(response);
  }

  async updateProfile(
    userData: Pick<User, 'name' | 'surname'>
  ): Promise<User> {
    const response = await this.put<unknown>('/users', userData);
    return UserSchema.parse(response);
  }

  async deleteAccount(): Promise<void> {
    return this.delete<void>('/users');
  }

  // Auth methods
  async login(email: string, password: string): Promise<AuthSession> {
    const response = await this.post<unknown>('/auth/login', {
      email,
      password,
    });
    return AuthSessionSchema.parse(response);
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    surname: string;
  }): Promise<AuthSession> {
    const response = await this.post<unknown>('/auth/register', userData);
    return AuthSessionSchema.parse(response);
  }

  async logout(): Promise<void> {
    return this.post<void>('/auth/logout');
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    const response = await this.post<unknown>('/auth/refresh');
    return RefreshTokenSchema.parse(response);
  }
}
