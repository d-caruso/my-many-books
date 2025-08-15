/**
 * Main API client that combines all individual API clients
 */

import { HttpClient, ApiClientConfig } from './base-client';
import { BookApi } from './book-api';
import { AuthorApi } from './author-api';
import { CategoryApi } from './category-api';
import { UserApi } from './user-api';

export class ApiClient {
  public readonly books: BookApi;
  public readonly authors: AuthorApi;
  public readonly categories: CategoryApi;
  public readonly users: UserApi;

  constructor(httpClient: HttpClient, config: ApiClientConfig) {
    this.books = new BookApi(httpClient, config);
    this.authors = new AuthorApi(httpClient, config);
    this.categories = new CategoryApi(httpClient, config);
    this.users = new UserApi(httpClient, config);
  }
}

// Factory function to create API client
export const createApiClient = (httpClient: HttpClient, config: ApiClientConfig): ApiClient => {
  return new ApiClient(httpClient, config);
};