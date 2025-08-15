/**
 * Category API client - platform agnostic
 */

import { BaseApiClient } from './base-client';
import { Category } from '@my-many-books/shared-types';

export class CategoryApi extends BaseApiClient {
  async getCategories(): Promise<Category[]> {
    return this.get<Category[]>('/api/categories');
  }

  async getCategory(id: number): Promise<Category> {
    return this.get<Category>(`/api/categories/${id}`);
  }

  async createCategory(categoryData: Omit<Category, 'id' | 'creationDate' | 'updateDate'>): Promise<Category> {
    return this.post<Category>('/api/categories', categoryData);
  }

  async updateCategory(id: number, categoryData: Partial<Omit<Category, 'id' | 'creationDate' | 'updateDate'>>): Promise<Category> {
    return this.put<Category>(`/api/categories/${id}`, categoryData);
  }

  async deleteCategory(id: number): Promise<void> {
    return this.delete<void>(`/api/categories/${id}`);
  }
}