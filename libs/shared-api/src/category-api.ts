/**
 * Category API client - platform agnostic
 */

import { BaseApiClient } from './base-client';
import { Category, CategorySchema } from '@my-many-books/shared-types';

const CategoriesArraySchema = CategorySchema.array();

export class CategoryApi extends BaseApiClient {
  async getCategories(): Promise<Category[]> {
    const response = await this.get<unknown>('/categories');
    return CategoriesArraySchema.parse(response);
  }

  async getCategory(id: number): Promise<Category> {
    const response = await this.get<unknown>(`/categories/${id}`);
    return CategorySchema.parse(response);
  }

  async createCategory(categoryData: Omit<Category, 'id' | 'creationDate' | 'updateDate'>): Promise<Category> {
    const response = await this.post<unknown>('/categories', categoryData);
    return CategorySchema.parse(response);
  }

  async updateCategory(id: number, categoryData: Partial<Omit<Category, 'id' | 'creationDate' | 'updateDate'>>): Promise<Category> {
    const response = await this.put<unknown>(`/categories/${id}`, categoryData);
    return CategorySchema.parse(response);
  }

  async deleteCategory(id: number): Promise<void> {
    return this.delete<void>(`/categories/${id}`);
  }
}
