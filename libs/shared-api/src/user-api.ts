/**
 * User API client - platform agnostic
 */

import { BaseApiClient } from './base-client';
import {
  UserProfile,
  UserProfileSchema,
} from '@my-many-books/shared-types';

export class UserApi extends BaseApiClient {
  async getCurrentUser(): Promise<UserProfile> {
    const response = await this.get<unknown>('/users');
    return UserProfileSchema.parse(response);
  }

  async updateProfile(userData: Partial<{ email: string; name: string; surname: string }>): Promise<UserProfile> {
    const response = await this.put<unknown>('/users', userData);
    return UserProfileSchema.parse(response);
  }

  async deleteAccount(): Promise<void> {
    await this.delete<unknown>('/users');
  }

}
