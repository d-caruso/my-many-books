/**
 * User API client - platform agnostic
 */

import { BaseApiClient } from './base-client';
import { User, AuthUser } from '@my-many-books/shared-types';

export class UserApi extends BaseApiClient {
  async getCurrentUser(): Promise<User> {
    return this.get<User>('/api/users');
  }

  async updateProfile(userData: Partial<Omit<User, 'id' | 'creationDate' | 'updateDate'>>): Promise<User> {
    return this.put<User>('/api/users', userData);
  }

  async deleteAccount(): Promise<void> {
    return this.delete<void>('/api/users');
  }

  // Auth methods
  async login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    return this.post<{ user: AuthUser; token: string }>('/api/auth/login', {
      email,
      password
    });
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    surname: string;
  }): Promise<{ user: AuthUser; token: string }> {
    return this.post<{ user: AuthUser; token: string }>('/api/auth/register', userData);
  }

  async logout(): Promise<void> {
    return this.post<void>('/api/auth/logout');
  }

  async refreshToken(): Promise<{ token: string }> {
    return this.post<{ token: string }>('/api/auth/refresh');
  }
}