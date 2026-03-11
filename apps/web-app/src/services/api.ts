/**
 * Unified API service using shared-api library
 * Replaces the old api.ts with modern monorepo architecture
 */

import { createApiClient, ApiClientConfig } from '@my-many-books/shared-api';
import type { ApiClient, HttpClient } from '@my-many-books/shared-api';
import type {
  ApiError,
  Author,
  Book,
  Category,
  PaginatedResponse,
  SearchFilters,
  SearchResult,
  User,
} from '@my-many-books/shared-types';
import { SearchFiltersSchema } from '@my-many-books/shared-types';
import { env } from '../config/env';
import { authService } from './authService';
import { AxiosHttpClient } from './http-client';
import {
  isDevelopmentWithoutApiConfig,
  extractAuthorIds,
  extractCategoryIds,
  sanitizeString,
  mapUserProfileToUser,
} from './api-helpers';
import type { CreateBookInput, UpdateBookInput } from './api-helpers';
import { getMockBooks, getMockCategories, getMockAuthors, getMockSearchResults } from './mock-data';
import { AdminApiService } from './admin-api.service';

export * from './admin-types';
export type { CreateBookInput, UpdateBookInput };

// Interface for API service dependencies
interface ApiServiceDependencies {
  apiClient?: ApiClient;
  httpClient?: HttpClient;
  config?: ApiClientConfig;
}

// Enhanced API service with dependency injection and mock data support
class ApiService extends AdminApiService {
  private apiClient: ApiClient;
  private categoriesCache: { userKey: string | null; data: Category[] | null } = {
    userKey: null,
    data: null,
  };
  private categoriesInFlightRequest: { userKey: string | null; promise: Promise<Category[]> | null } = {
    userKey: null,
    promise: null,
  };

  constructor(dependencies: ApiServiceDependencies = {}) {
    const validBaseURL = env.API_BASE_URL;

    const apiConfig: ApiClientConfig = (dependencies.config || {
      baseURL: validBaseURL,
      timeout: 10000,
      getAuthToken: async () => authService.getIdToken(),
      onUnauthorized: () => {
        void authService.logout();
        window.location.href = '/auth';
      },
    }) as ApiClientConfig;

    const httpClient = dependencies.httpClient || new AxiosHttpClient(apiConfig.baseURL, apiConfig.timeout);

    super(httpClient, apiConfig);

    this.apiClient = dependencies.apiClient || createApiClient(httpClient, apiConfig);
  }

  public getHttpClient(): HttpClient {
    return this.httpClient;
  }

  public getApiConfig(): ApiClientConfig {
    return this.apiConfig;
  }

  private async getCategoriesCacheUserKey(): Promise<string> {
    try {
      const user = await authService.getCurrentUser();
      if (user?.id != null) {
        return `user:${String(user.id)}`;
      }
    } catch {
      // Best-effort cache scoping. If auth user cannot be read, fall back to anonymous scope.
    }
    return 'anonymous';
  }

  private invalidateCategoriesCache(): void {
    this.categoriesCache = { userKey: null, data: null };
    this.categoriesInFlightRequest = { userKey: null, promise: null };
  }

  private async fetchCategoriesUncached(): Promise<Category[]> {
    if (isDevelopmentWithoutApiConfig()) {
      return getMockCategories();
    }
    return this.apiClient.categories.getCategories();
  }

  // User methods
  async getCurrentUser(): Promise<User> {
    const profile = await this.apiClient.users.getCurrentUser();
    return mapUserProfileToUser(profile);
  }

  async updateProfile(userData: Pick<User, 'name' | 'surname'>): Promise<User> {
    const profile = await this.apiClient.users.updateProfile(userData);
    return mapUserProfileToUser(profile);
  }

  // Book methods with development mock data fallback
  async getBooks(filters?: SearchFilters): Promise<PaginatedResponse<Book>> {
    if (isDevelopmentWithoutApiConfig()) {
      return getMockBooks();
    }

    return this.apiClient.books.getBooks(
      filters?.page || 1,
      filters?.limit || env.BOOKS_PAGINATION_DEFAULT,
      true, // includeAuthors
      true  // includeCategories
    );
  }

  async getBook(id: number): Promise<Book> {
    return this.apiClient.books.getBook(id);
  }

  async createBook(bookData: CreateBookInput): Promise<Book> {
    const authorIds = extractAuthorIds(bookData);
    const categoryIds = extractCategoryIds(bookData);

    const backendData = {
      title: bookData.title,
      isbnCode: bookData.isbnCode,
      ...(bookData.editionNumber && { editionNumber: bookData.editionNumber }),
      ...(sanitizeString(bookData.editionDate) && { editionDate: sanitizeString(bookData.editionDate) }),
      ...(bookData.status && { status: bookData.status }),
      ...(sanitizeString(bookData.notes) && { notes: sanitizeString(bookData.notes) }),
      ...(authorIds && { authorIds }),
      ...(categoryIds && { categoryIds })
    };

    return this.apiClient.books.createBook(backendData);
  }

  async updateBook(id: number, bookData: UpdateBookInput): Promise<Book> {
    const backendData: Record<string, unknown> = {};

    const title = sanitizeString(bookData.title);
    if (title) {
      backendData.title = title;
    }

    const isbnCode = sanitizeString(bookData.isbnCode);
    if (isbnCode) {
      backendData.isbnCode = isbnCode;
    }

    backendData.editionNumber = bookData.editionNumber ?? null;

    const editionDate = sanitizeString(bookData.editionDate);
    backendData.editionDate = editionDate ?? null;

    if (bookData.status) {
      backendData.status = bookData.status;
    }

    const notes = sanitizeString(bookData.notes);
    backendData.notes = notes ?? null;

    const authorIds = extractAuthorIds(bookData);
    if (authorIds) {
      backendData.authorIds = authorIds;
    }

    const categoryIds = extractCategoryIds(bookData);
    if (categoryIds) {
      backendData.categoryIds = categoryIds;
    }

    const isPartialUpdate = Object.keys(backendData).length === 1 && backendData.status !== undefined;

    if (isPartialUpdate) {
      const status = backendData.status;
      if (status === 'reading' || status === 'paused' || status === 'finished') {
        return this.apiClient.books.patchBook(id, { status });
      }
    }

    return this.apiClient.books.updateBook(id, backendData);
  }

  async updateBookStatus(id: number, status: NonNullable<Book['status']>): Promise<Book> {
    return this.apiClient.books.updateBookStatus(id, status);
  }

  async deleteBook(id: number): Promise<void> {
    return this.apiClient.books.deleteBook(id);
  }

  // Search books with enhanced filters
  async searchBooks(searchParams: {
    q?: string;
    page?: number;
    limit?: number;
    status?: SearchFilters['status'];
    sortBy?: SearchFilters['sortBy'];
    sortOrder?: SearchFilters['sortOrder'];
    authorId?: number;
    categoryId?: number;
  }): Promise<SearchResult> {
    if (isDevelopmentWithoutApiConfig()) {
      return getMockSearchResults(searchParams);
    }

    const parsedQuery = SearchFiltersSchema.shape.query.safeParse(searchParams.q?.trim() ?? '');
    const query = parsedQuery.success ? parsedQuery.data : undefined;
    const parsedStatus = SearchFiltersSchema.shape.status.safeParse(searchParams.status);
    const parsedSortBy = SearchFiltersSchema.shape.sortBy.safeParse(searchParams.sortBy);
    const parsedSortOrder = SearchFiltersSchema.shape.sortOrder.safeParse(searchParams.sortOrder);

    const filters: SearchFilters = {
      query,
      status: parsedStatus.success ? parsedStatus.data : undefined,
      sortBy: parsedSortBy.success ? parsedSortBy.data : undefined,
      sortOrder: parsedSortOrder.success ? parsedSortOrder.data : undefined,
      authorId: searchParams.authorId,
      categoryId: searchParams.categoryId,
      page: searchParams.page,
      limit: searchParams.limit
    };

    return this.apiClient.books.searchBooks(filters);
  }

  // ISBN lookup
  async searchByISBN(isbn: string): Promise<Book | null> {
    return this.apiClient.books.searchByISBN(isbn);
  }

  // Categories methods with development mock data fallback
  async getCategories(): Promise<Category[]> {
    const userKey = await this.getCategoriesCacheUserKey();

    if (this.categoriesCache.data && this.categoriesCache.userKey === userKey) {
      return [...this.categoriesCache.data];
    }

    if (this.categoriesInFlightRequest.promise && this.categoriesInFlightRequest.userKey === userKey) {
      const data = await this.categoriesInFlightRequest.promise;
      return [...data];
    }

    const requestPromise = this.fetchCategoriesUncached();
    this.categoriesInFlightRequest = { userKey, promise: requestPromise };

    try {
      const categories = await requestPromise;
      const cached = [...categories];
      this.categoriesCache = { userKey, data: cached };
      return [...cached];
    } finally {
      if (this.categoriesInFlightRequest.userKey === userKey) {
        this.categoriesInFlightRequest = { userKey: null, promise: null };
      }
    }
  }

  async getCategory(id: number): Promise<Category> {
    return this.apiClient.categories.getCategory(id);
  }

  async createCategory(categoryData: { name: string }): Promise<Category> {
    const created = await this.apiClient.categories.createCategory(categoryData);
    this.invalidateCategoriesCache();
    return created;
  }

  async updateCategory(id: number, categoryData: Partial<{ name: string }>): Promise<Category> {
    const updated = await this.apiClient.categories.updateCategory(id, categoryData);
    this.invalidateCategoriesCache();
    return updated;
  }

  async deleteCategory(id: number, force?: boolean): Promise<void> {
    await this.apiClient.categories.deleteCategory(id, force);
    this.invalidateCategoriesCache();
  }

  // Authors methods with development mock data fallback
  async getAuthors(): Promise<Author[]> {
    if (isDevelopmentWithoutApiConfig()) {
      return getMockAuthors();
    }
    return this.apiClient.authors.getAuthors();
  }

  async searchAuthors(searchTerm: string): Promise<Author[]> {
    if (!searchTerm.trim()) {
      return [];
    }

    const term = searchTerm.toLowerCase().trim();
    const authors = isDevelopmentWithoutApiConfig()
      ? await getMockAuthors()
      : await this.apiClient.authors.getAuthors();

    return authors.filter(author =>
      author.name.toLowerCase().includes(term) ||
      author.surname.toLowerCase().includes(term)
    );
  }

  async getAuthor(id: number): Promise<Author> {
    return this.apiClient.authors.getAuthor(id);
  }

  async createAuthor(authorData: { name: string; surname: string; nationality?: string }): Promise<Author> {
    return this.apiClient.authors.createAuthor(authorData);
  }

  async updateAuthor(
    id: number,
    authorData: Partial<{ name: string; surname: string; nationality?: string | null }>
  ): Promise<Author> {
    return this.apiClient.authors.updateAuthor(id, authorData);
  }

  async deleteAuthor(id: number, force?: boolean): Promise<void> {
    return this.apiClient.authors.deleteAuthor(id, force);
  }

  // Error handler
  handleApiError(error: { response?: { data?: unknown }; message?: string }): ApiError {
    if (error.response?.data) {
      return error.response.data as ApiError;
    }
    return {
      error: 'Network error',
      details: error.message || 'Unknown error occurred'
    };
  }
}

// Factory function for creating API service with dependencies (useful for testing)
export const createApiService = (dependencies?: ApiServiceDependencies): ApiService => {
  return new ApiService(dependencies);
};

// Default API service instance
export const apiService = new ApiService();

// Export the class and interface for direct usage in tests
export { ApiService };
export type { ApiServiceDependencies };

// Legacy export for compatibility - ensure all existing imports continue to work
export const bookAPI = {
  searchBooks: apiService.searchBooks.bind(apiService),
  searchByISBN: apiService.searchByISBN.bind(apiService),
  getBooks: apiService.getBooks.bind(apiService),
  getBook: apiService.getBook.bind(apiService),
  createBook: apiService.createBook.bind(apiService),
  updateBook: apiService.updateBook.bind(apiService),
  updateBookStatus: apiService.updateBookStatus.bind(apiService),
  deleteBook: apiService.deleteBook.bind(apiService),
};

export const categoryAPI = {
  getCategories: apiService.getCategories.bind(apiService),
  getCategory: apiService.getCategory.bind(apiService),
  createCategory: apiService.createCategory.bind(apiService),
  updateCategory: apiService.updateCategory.bind(apiService),
  deleteCategory: apiService.deleteCategory.bind(apiService),
};

export const authorAPI = {
  getAuthors: apiService.getAuthors.bind(apiService),
  searchAuthors: apiService.searchAuthors.bind(apiService),
  getAuthor: apiService.getAuthor.bind(apiService),
  createAuthor: apiService.createAuthor.bind(apiService),
  updateAuthor: apiService.updateAuthor.bind(apiService),
  deleteAuthor: apiService.deleteAuthor.bind(apiService),
};

export const userAPI = {
  getCurrentUser: apiService.getCurrentUser.bind(apiService),
  updateProfile: apiService.updateProfile.bind(apiService),
};

// Individual API clients are accessed through the main apiService instance
