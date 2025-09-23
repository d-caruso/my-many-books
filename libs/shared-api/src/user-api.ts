/**
 * User API client - platform agnostic
 */

import { BaseApiClient } from './base-client';
import { User, AuthUser } from '@my-many-books/shared-types';

export class UserApi extends BaseApiClient {
  async getCurrentUser(): Promise<User> {
    return this.get<User>('/users');
  }

  async updateProfile(userData: Partial<Omit<User, 'id' | 'creationDate' | 'updateDate'>>): Promise<User> {
    return this.put<User>('/users', userData);
  }

  async deleteAccount(): Promise<void> {
    return this.delete<void>('/users');
  }

  // Auth methods
  async login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    return this.post<{ user: AuthUser; token: string }>('/auth/login', {
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
    return this.post<{ user: AuthUser; token: string }>('/auth/register', userData);
  }

  async logout(): Promise<void> {
    return this.post<void>('/auth/logout');
  }

  async refreshToken(): Promise<{ token: string }> {
    return this.post<{ token: string }>('/auth/refresh');
  }
}