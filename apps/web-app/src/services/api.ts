/**
 * Unified API service using shared-api library
 * Replaces the old api.ts with modern monorepo architecture
 */

import { createApiClient, HttpClient, ApiClientConfig } from '@my-many-books/shared-api';
import type { ApiClient } from '@my-many-books/shared-api';
import { BookFormData as WebBookFormData } from '../components/Book/BookForm';
import type {
  ApiError,
  Author,
  Book,
  BookFormData as SharedBookFormData,
  Category,
  PaginatedResponse,
  SearchFilters,
  SearchResult,
  User,
  MobileHooksListenerSettings,
  HealthStatus,
  MobileAnalyticsStats,
  MobileAnalyticsActionTypeBreakdown,
  MobileAnalyticsProcessingStatus,
} from '@my-many-books/shared-types';
import { SearchFiltersSchema } from '@my-many-books/shared-types';
import axios from 'axios';
import i18n from 'i18next';
import { env } from '../config/env';
import { authService } from './authService';


// Axios adapter for web platform
class AxiosHttpClient implements HttpClient {
  private axios;

  constructor(baseURL?: string, timeout?: number) {
    // NOTE: We don't pass baseURL to axios.create() because shared-api's BaseApiClient
    // constructs full URLs by prepending baseURL to endpoints. Axios should receive
    // complete URLs, not relative paths. This is the industry standard for layered APIs.
    this.axios = axios.create({
      timeout,
      withCredentials: true, // Send cookies for refresh token
    });
    // Add request interceptor for auth token
    this.axios.interceptors.request.use(async (config: any) => {
      const token = await authService.getIdToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response: any) => {
        // Extract data field from API response structure
        // In production, unwrap nested success response if present
        if (response.data && response.data.success && response.data.data !== undefined) {
          return response.data.data;
        }
        return response.data;
      },
      async (error: any) => {
        // Handle timeout errors (client-side, no response from API)
        if (error.code === 'ECONNABORTED') {
          error.message = i18n.t('common:errors.timeout', {
            defaultValue: 'The server is taking too long to respond. Please try again.',
          });
          return Promise.reject(error);
        }

        if (error.response?.status === 401) {
          // Try to refresh token
          const refreshed = await authService.silentRefresh();

          if (refreshed) {
            // Retry the original request
            const token = await authService.getIdToken();
            error.config.headers.Authorization = `Bearer ${token}`;
            return axios.request(error.config);
          }

          // Redirect to login if refresh fails
          if (typeof window !== 'undefined' && import.meta.env.MODE !== 'test') {
            window.location.href = '/auth';
          }
        }

        // Handle authorization errors (403 Forbidden)
        // API returns error codes - client handles translation
        if (error.response?.status === 403) {
          const errorCode = error.response?.data?.error?.code;
          const authError = {
            ...error,
            isAuthorizationError: true,
            code: errorCode,
            message: error.response?.data?.error?.message || 'Permission denied',
            details: error.response?.data?.error?.details,
          };
          return Promise.reject(authError);
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: any): Promise<T> {
    return this.axios.get(url, config);
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.axios.post(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.axios.put(url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.axios.patch(url, data, config);
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    return this.axios.delete(url, config);
  }
}

type CreateBookInput = WebBookFormData | SharedBookFormData;
type UpdateBookInput = Partial<WebBookFormData> | Partial<SharedBookFormData>;

const isDevelopmentWithoutApiConfig = (): boolean =>
  import.meta.env.MODE === 'development' &&
  !(import.meta.env.VITE_API_ORIGIN || import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL);

const extractAuthorIds = (data: CreateBookInput | UpdateBookInput): number[] | undefined => {
  if ('selectedAuthors' in data && Array.isArray(data.selectedAuthors)) {
    return data.selectedAuthors.map(author => author.id);
  }
  if ('authorIds' in data && Array.isArray(data.authorIds)) {
    return data.authorIds;
  }
  return undefined;
};

const extractCategoryIds = (data: CreateBookInput | UpdateBookInput): number[] | undefined => {
  if ('selectedCategories' in data && Array.isArray(data.selectedCategories)) {
    return data.selectedCategories;
  }
  if ('categoryIds' in data && Array.isArray(data.categoryIds)) {
    return data.categoryIds;
  }
  return undefined;
};

const sanitizeString = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

// Interface for API service dependencies
interface ApiServiceDependencies {
  apiClient?: ApiClient;
  httpClient?: HttpClient;
  config?: ApiClientConfig;
}

export interface AuditLoggingStatus {
  enabled: boolean;
  source: 'force_disabled' | 'force_enabled' | 'database' | 'default';
  canChange: boolean;
}

export interface FullTextSearchStatus {
  enabled: boolean;
  source: 'force_disabled' | 'force_enabled' | 'database' | 'default';
  canChange: boolean;
  sortableFields?: string[];
  defaultSort?: string;
}

// Enhanced API service with dependency injection and mock data support
class ApiService {
  private apiClient: ApiClient;
  private httpClient: HttpClient;
  private apiConfig: ApiClientConfig;
  private categoriesCache: { userKey: string | null; data: Category[] | null } = {
    userKey: null,
    data: null,
  };
  private categoriesInFlightRequest: { userKey: string | null; promise: Promise<Category[]> | null } = {
    userKey: null,
    promise: null,
  };

  constructor(dependencies: ApiServiceDependencies = {}) {
    const injectedApiClient = dependencies.apiClient;
    // Create API client configuration (use injected or default)
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

    this.apiConfig = apiConfig;

    // Create HTTP client (use injected or default)
    const httpClient = dependencies.httpClient || new AxiosHttpClient(apiConfig.baseURL, apiConfig.timeout);
    this.httpClient = httpClient;

    // Create and configure the API client
    this.apiClient = injectedApiClient || createApiClient(httpClient, apiConfig);
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
      return this.getMockCategories();
    }
    return this.apiClient.categories.getCategories();
  }

  // Mock data for development mode - preserved from old api.ts
  private getMockBooks(): Promise<PaginatedResponse<Book>> {
    const mockBooks: Book[] = [
      {
        id: 1,
        title: "The Great Gatsby",
        isbnCode: "9780743273565",
        editionNumber: 1,
        editionDate: "2004-09-30",
        status: "finished",
        notes: "Classic American literature",
        userId: 1,
        authors: [{ id: 1, name: "F. Scott", surname: "Fitzgerald", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }],
        categories: [{ id: 1, name: "Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }, { id: 2, name: "Classic Literature", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }],
        creationDate: "2024-01-15T10:00:00Z",
        updateDate: "2024-01-15T10:00:00Z"
      },
      {
        id: 2,
        title: "To Kill a Mockingbird",
        isbnCode: "9780061120084",
        editionNumber: 1,
        editionDate: "2006-05-23",
        status: "reading",
        notes: "Powerful story about justice and morality",
        userId: 1,
        authors: [{ id: 2, name: "Harper", surname: "Lee", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }],
        categories: [{ id: 1, name: "Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }, { id: 3, name: "Social Issues", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }],
        creationDate: "2024-01-20T14:30:00Z",
        updateDate: "2024-01-25T16:45:00Z"
      },
      {
        id: 3,
        title: "1984",
        isbnCode: "9780451524935",
        editionNumber: 1,
        editionDate: "1961-01-01",
        status: "paused",
        notes: "Dystopian masterpiece",
        userId: 1,
        authors: [{ id: 3, name: "George", surname: "Orwell", nationality: "British", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }],
        categories: [{ id: 1, name: "Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }, { id: 4, name: "Dystopian", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }],
        creationDate: "2024-02-01T09:15:00Z",
        updateDate: "2024-02-01T09:15:00Z"
      }
    ];

    return Promise.resolve({
      books: mockBooks,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: mockBooks.length,
        itemsPerPage: 10
      }
    });
  }

  private getMockCategories(): Promise<Category[]> {
    return Promise.resolve([
      { id: 1, name: "Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 2, name: "Classic Literature", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 3, name: "Social Issues", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 4, name: "Dystopian", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 5, name: "Science Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 6, name: "Mystery", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 7, name: "Romance", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 8, name: "Non-Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }
    ]);
  }

  private getMockAuthors(): Promise<Author[]> {
    return Promise.resolve([
      { id: 1, name: "F. Scott", surname: "Fitzgerald", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 2, name: "Harper", surname: "Lee", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 3, name: "George", surname: "Orwell", nationality: "British", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 4, name: "Jane", surname: "Austen", nationality: "British", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 5, name: "Mark", surname: "Twain", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }
    ]);
  }

  private getMockSearchResults(searchParams: {
    q?: string;
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    authorId?: number;
    categoryId?: number;
  }): Promise<SearchResult> {
    const mockBooksData = this.getMockBooks();
    return mockBooksData.then(data => {
      let filteredBooks = data.books || [];
      
      // Filter by search query
      if (searchParams.q) {
        const query = searchParams.q.toLowerCase();
        filteredBooks = filteredBooks.filter(book => 
          book.title.toLowerCase().includes(query) ||
          book.authors?.some(author => 
            `${author.name} ${author.surname}`.toLowerCase().includes(query)
          ) ||
          book.isbnCode.includes(query)
        );
      }
      
      // Filter by status
      if (searchParams.status) {
        filteredBooks = filteredBooks.filter(book => book.status === searchParams.status);
      }
      
      // Filter by author
      if (searchParams.authorId) {
        filteredBooks = filteredBooks.filter(book => 
          book.authors?.some(author => author.id === searchParams.authorId)
        );
      }
      
      // Filter by category
      if (searchParams.categoryId) {
        filteredBooks = filteredBooks.filter(book => 
          book.categories?.some(category => category.id === searchParams.categoryId)
        );
      }
      
      // Sort results
      if (searchParams.sortBy) {
        switch (searchParams.sortBy) {
          case 'title':
            filteredBooks.sort((a, b) => a.title.localeCompare(b.title));
            break;
          case 'author':
            filteredBooks.sort((a, b) => {
              const aAuthor = a.authors?.[0] ? `${a.authors[0].name} ${a.authors[0].surname}` : '';
              const bAuthor = b.authors?.[0] ? `${b.authors[0].name} ${b.authors[0].surname}` : '';
              return aAuthor.localeCompare(bAuthor);
            });
            break;
          case 'date-added':
            filteredBooks.sort((a, b) => {
              const aDate = a.creationDate ? new Date(a.creationDate).getTime() : 0;
              const bDate = b.creationDate ? new Date(b.creationDate).getTime() : 0;
              return bDate - aDate;
            });
            break;
        }
      }
      
      const page = searchParams.page || 1;
      const limit = searchParams.limit || env.BOOKS_PAGINATION_DEFAULT;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedBooks = filteredBooks.slice(startIndex, endIndex);
      
      return {
        books: paginatedBooks,
        total: filteredBooks.length,
        hasMore: endIndex < filteredBooks.length,
        page
      };
    });
  }

  // User methods
  async getCurrentUser(): Promise<User> {
    return this.apiClient.users.getCurrentUser();
  }

  async updateProfile(userData: Pick<User, 'name' | 'surname'>): Promise<User> {
    return this.apiClient.users.updateProfile(userData);
  }

  // Admin methods
  async getAdminStats(): Promise<any> {
    return this.fetchAdminData('/admin/stats/summary');
  }

  async getMobileAnalyticsStats(signal?: AbortSignal): Promise<MobileAnalyticsStatsResponse> {
    return this.fetchAdminData('/admin/mobile-analytics/stats', { signal });
  }

  async getHookActionStats(signal?: AbortSignal): Promise<{ actionTypeBreakdown: MobileAnalyticsActionTypeBreakdown[] }> {
    return this.fetchAdminData('/admin/mobile-hooks/analytics/stats', { signal });
  }

  private buildAdminUrl(endpoint: string): string {
    const baseURL = env.API_BASE_URL;
    const cleanBaseURL = baseURL.replace(/\/$/, '');
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${cleanBaseURL}${normalizedEndpoint}`;
  }

  private async fetchAdminData<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = this.buildAdminUrl(endpoint);
    const token = await authService.getIdToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const payload = await response.json();
    return payload.data || payload;
  }

  private async fetchAdminPayload<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; pagination?: Record<string, unknown> }> {
    const url = this.buildAdminUrl(endpoint);
    const token = await authService.getIdToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  async getAdminHooks(): Promise<{ hooks: AdminHookSummary[]; total?: number }> {
    return this.fetchAdminData('/admin/hooks');
  }

  async getAdminHookStats(): Promise<AdminHookStats> {
    return this.fetchAdminData('/admin/hooks/stats/summary');
  }

  async reloadAdminHooks(): Promise<void> {
    await this.fetchAdminData('/admin/hooks/reload', { method: 'POST' });
  }

  async createAdminHook(data: {
    name: string;
    description: string;
    eventPattern: string;
    actionType: string;
    actionConfig: Record<string, any>;
    priority: number;
    isActive: boolean;
  }): Promise<AdminHookSummary> {
    return this.fetchAdminData('/admin/hooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminHook(
    hookId: number,
    data: {
      name: string;
      description: string;
      eventPattern: string;
      actionType: string;
      actionConfig: Record<string, any>;
      priority: number;
      isActive: boolean;
    }
  ): Promise<AdminHookSummary> {
    return this.fetchAdminData(`/admin/hooks/${hookId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAdminHookExecutions(params: {
    hookId?: number;
    success?: boolean;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminHookExecutionResponse> {
    const query = new URLSearchParams();
    if (params.success !== undefined) query.append('success', String(params.success));
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    if (params.page !== undefined) query.append('page', params.page.toString());
    if (params.pageSize !== undefined) query.append('limit', params.pageSize.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    const endpoint = params.hookId
      ? `/admin/hooks/${params.hookId}/executions${queryString}`
      : `/admin/hooks/executions/recent${queryString}`;

    const payload = await this.fetchAdminPayload<{ executions: AdminHookExecution[] }>(endpoint);
    const pagination = payload.pagination as
      | { totalItems?: number; currentPage?: number; itemsPerPage?: number }
      | undefined;

    return {
      executions: payload.data?.executions || [],
      total: pagination?.totalItems ?? payload.data?.executions?.length ?? 0,
      page: pagination?.currentPage ?? params.page ?? 1,
      pageSize: pagination?.itemsPerPage ?? params.pageSize ?? payload.data?.executions?.length ?? 0,
    };
  }

  async getAdminMobileHooksListenerSettings(): Promise<AdminMobileHooksListenerSettingsResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/settings/listeners');
  }

  async updateAdminMobileHooksListenerSettings(
    settings: Partial<MobileHooksListenerSettings>
  ): Promise<AdminMobileHooksListenerSettingsUpdateResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/settings/listeners', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getAdminMobileHooksConfigListeners(
    signal?: AbortSignal
  ): Promise<AdminMobileHooksConfigListenersResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/config/listeners', { signal });
  }

  async getAdminMobileHooksActionsConfigMappings(): Promise<AdminMobileHooksActionsConfigMappingsResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/actions-config/mappings');
  }

  async updateAdminMobileHooksConfigListeners(
    listeners: AdminMobileHooksConfigListenersUpdateRequest
  ): Promise<AdminMobileHooksConfigListenersUpdateResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/config/listeners', {
      method: 'PUT',
      body: JSON.stringify(listeners),
    });
  }

  async updateAdminMobileHooksActionsConfigMappings(
    request: AdminMobileHooksActionsConfigMappingsUpdateRequest
  ): Promise<AdminMobileHooksActionsConfigMappingsUpdateResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/actions-config/mappings', {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async testAdminMobileHooksActionsConfig(
    request: AdminMobileHooksActionsConfigTestRequest = {}
  ): Promise<AdminMobileHooksActionsConfigTestResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/actions-config/test', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getAdminMobileHooksActionTypes(): Promise<AdminMobileHooksActionTypesResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/actions-config/types');
  }

  async updateAdminMobileHooksActionTypeSettings(
    actionType: string,
    settings: AdminMobileHooksActionTypeSettingsUpdateRequest
  ): Promise<AdminMobileHooksActionTypeSettingsUpdateResponse> {
    const payload = await this.fetchAdminData<any>(
      `/admin/mobile-hooks/actions-config/types/${encodeURIComponent(actionType)}`,
      {
        method: 'PUT',
        body: JSON.stringify(settings),
      }
    );

    return {
      actionType: payload.actionType ?? payload.action_type ?? actionType,
      settings: payload.settings,
      updated: payload.updated,
      lastUpdated: payload.lastUpdated,
    };
  }

  async testAdminMobileHooksActionType(
    actionType: string,
    request: Omit<AdminMobileHooksActionTypeTestRequest, 'actionType'> = {}
  ): Promise<AdminMobileHooksActionTypeTestResponse> {
    return this.fetchAdminData(
      `/admin/mobile-hooks/actions-config/types/${encodeURIComponent(actionType)}/test`,
      {
        method: 'POST',
        body: JSON.stringify({ actionType, ...request }),
      }
    );
  }

  async getAdminMobileHooksEmergencyStatus(): Promise<AdminMobileHooksEmergencyStatusResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/emergency');
  }

  async updateAdminMobileHooksEmergencyStatus(
    request: AdminMobileHooksEmergencyStatusUpdateRequest
  ): Promise<AdminMobileHooksEmergencyStatusUpdateResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/emergency', {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async getAdminMobileHooksHealth(): Promise<AdminMobileHooksHealthResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/health');
  }

  async getAdminMobileHooksRecentEvents(
    limit: number = 50,
    signal?: AbortSignal
  ): Promise<AdminMobileHooksRecentEventsResponse> {
    const safeLimit = Math.min(200, Math.max(1, Math.floor(limit)));
    return this.fetchAdminData(
      `/admin/mobile-hooks/analytics/events/recent?limit=${encodeURIComponent(safeLimit)}`,
      { signal }
    );
  }

  async getAdminUsers(page: number = 1, limit: number = 10, search?: string): Promise<any> {
    const baseURL = env.API_BASE_URL;
    const token = await authService.getIdToken();
    const cleanBaseURL = baseURL.replace(/\/$/, '');

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) {
      queryParams.append('search', search);
    }

    const url = `${cleanBaseURL}/admin/users?${queryParams}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  async getAdminUser(id: number): Promise<any> {
    const baseURL = env.API_BASE_URL;
    const token = await authService.getIdToken();
    const cleanBaseURL = baseURL.replace(/\/$/, '');

    const url = `${cleanBaseURL}/admin/users/${id}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  async updateAdminUser(id: number, userData: any): Promise<any> {
    const baseURL = env.API_BASE_URL;
    const token = await authService.getIdToken();
    const cleanBaseURL = baseURL.replace(/\/$/, '');

    const url = `${cleanBaseURL}/admin/users/${id}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  async deleteAdminUser(id: number): Promise<any> {
    const baseURL = env.API_BASE_URL;
    const token = await authService.getIdToken();
    const cleanBaseURL = baseURL.replace(/\/$/, '');

    const url = `${cleanBaseURL}/admin/users/${id}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  async getAdminBooks(page: number = 1, limit: number = 10, search?: string, userId?: number): Promise<any> {
    const baseURL = env.API_BASE_URL;
    const token = await authService.getIdToken();
    const cleanBaseURL = baseURL.replace(/\/$/, '');

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) {
      queryParams.append('search', search);
    }
    if (userId) {
      queryParams.append('userId', userId.toString());
    }

    const url = `${cleanBaseURL}/admin/books?${queryParams}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  async getAdminBook(id: number): Promise<any> {
    const baseURL = env.API_BASE_URL;
    const token = await authService.getIdToken();
    const cleanBaseURL = baseURL.replace(/\/$/, '');

    const url = `${cleanBaseURL}/admin/books/${id}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  async updateAdminBook(id: number, bookData: any): Promise<any> {
    const baseURL = env.API_BASE_URL;
    const token = await authService.getIdToken();
    const cleanBaseURL = baseURL.replace(/\/$/, '');

    const url = `${cleanBaseURL}/admin/books/${id}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  async deleteAdminBook(id: number): Promise<any> {
    const baseURL = env.API_BASE_URL;
    const token = await authService.getIdToken();
    const cleanBaseURL = baseURL.replace(/\/$/, '');

    const url = `${cleanBaseURL}/admin/books/${id}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  // Book methods with development mock data fallback
  async getBooks(filters?: SearchFilters): Promise<PaginatedResponse<Book>> {
    // In development mode without API URL, return mock data
    if (isDevelopmentWithoutApiConfig()) {
      return this.getMockBooks();
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
      return this.apiClient.books.patchBook(id, { status: backendData.status });
    }

    return this.apiClient.books.updateBook(id, backendData);
  }

  async updateBookStatus(id: number, status: Book['status']): Promise<Book> {
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
    status?: string;
    sortBy?: string;
    authorId?: number;
    categoryId?: number;
  }): Promise<SearchResult> {
    // In development mode without API URL, return mock data
    if (isDevelopmentWithoutApiConfig()) {
      return this.getMockSearchResults(searchParams);
    }

    // Transform parameters for shared API
    const parsedQuery = SearchFiltersSchema.shape.query.safeParse(searchParams.q?.trim() ?? '');
    const query = parsedQuery.success ? parsedQuery.data : undefined;

    const filters: SearchFilters = {
      query,
      status: searchParams.status as any,
      sortBy: searchParams.sortBy as any,
      authorId: searchParams.authorId,
      categoryId: searchParams.categoryId,
      page: searchParams.page,
      limit: searchParams.limit
    };

    return this.apiClient.books.searchBooks(filters);
  }

  // ISBN lookup
  async searchByISBN(isbn: string): Promise<any> {
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

  async deleteCategory(id: number): Promise<void> {
    await this.apiClient.categories.deleteCategory(id);
    this.invalidateCategoriesCache();
  }

  // Authors methods with development mock data fallback
  async getAuthors(): Promise<Author[]> {
    // In development mode without API URL, return mock data
    if (isDevelopmentWithoutApiConfig()) {
      return this.getMockAuthors();
    }

    return this.apiClient.authors.getAuthors();
  }

  async searchAuthors(searchTerm: string): Promise<Author[]> {
    if (!searchTerm.trim()) {
      return [];
    }

    const term = searchTerm.toLowerCase().trim();
    const authors = isDevelopmentWithoutApiConfig()
      ? await this.getMockAuthors()
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

  async deleteAuthor(id: number): Promise<void> {
    return this.apiClient.authors.deleteAuthor(id);
  }

  // Error handler
  handleApiError(error: any): ApiError {
    if (error.response?.data) {
      return error.response.data as ApiError;
    }
    return {
      error: 'Network error',
      details: error.message || 'Unknown error occurred'
    };
  }

  private buildUrl(path: string): string {
    const base = this.apiConfig.baseURL.replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }

  async getAuditLoggingStatus(): Promise<AuditLoggingStatus> {
    return this.httpClient.get<AuditLoggingStatus>(this.buildUrl('/admin/settings/audit-logging'));
  }

  async updateAuditLoggingStatus(enabled: boolean): Promise<AuditLoggingStatus> {
    return this.httpClient.patch<AuditLoggingStatus>(this.buildUrl('/admin/settings/audit-logging'), {
      enabled,
    });
  }

  async getFullTextSearchStatus(): Promise<FullTextSearchStatus> {
    return this.httpClient.get<FullTextSearchStatus>(this.buildUrl('/admin/settings/search/status'));
  }

  async updateFullTextSearchStatus(settings: {
    enabled?: boolean;
    sortableFields?: string[];
    defaultSort?: string;
  }): Promise<FullTextSearchStatus> {
    return this.httpClient.patch<FullTextSearchStatus>(this.buildUrl('/admin/settings/search'), settings);
  }
}

export interface AdminMobileHooksListenerSettingsResponse {
  settings: MobileHooksListenerSettings;
  lastUpdated: string | null;
  version: string;
}

export interface AdminMobileHooksListenerSettingsUpdateResponse {
  settings: MobileHooksListenerSettings;
  updated: string[];
  lastUpdated: string;
}

export type AdminMobileHooksConfigListenerMap = Record<string, { enabled: boolean }>;

export interface AdminMobileHooksConfigListenersResponse {
  listeners: AdminMobileHooksConfigListenerMap;
  categories: AdminMobileHooksConfigListenerMap;
  availableEvents: string[];
  lastUpdated: string | null;
}

export interface AdminMobileHooksConfigListenersUpdateRequest {
  listeners?: Record<string, { enabled: boolean }>;
  categories?: Record<string, { enabled: boolean }>;
  analytics?: boolean;
  errorReporting?: boolean;
  offlineStorage?: boolean;
  performanceMonitoring?: boolean;
}

export interface AdminMobileHooksConfigListenersUpdateResponse {
  updated: string[];
  lastUpdated: string;
}

export type AdminMobileHooksActionMappings = Record<string, string[]>;

export interface AdminMobileHooksActionsConfigMappingsResponse {
  actions: AdminMobileHooksActionMappings;
  actionSettings: Record<string, unknown>;
  availableEvents: string[];
  lastUpdated: string | null;
}

export interface AdminMobileHooksActionsConfigMappingsUpdateRequest {
  actions?: AdminMobileHooksActionMappings;
  actionSettings?: Record<string, unknown>;
}

export interface AdminMobileHooksActionsConfigMappingsUpdateResponse {
  config: AdminMobileHooksActionsConfigMappingsResponse;
  updated: string[];
  lastUpdated: string;
}

export interface AdminMobileHooksActionsConfigTestRequest {
  eventType?: string;
  payload?: Record<string, unknown>;
}

export interface AdminMobileHooksActionsConfigTestResponse {
  success: boolean;
  eventType: string;
  payload: Record<string, unknown>;
  mappedActions: string[];
  actionResults: Array<{
    actionType: string;
    enabled: boolean;
    wouldExecute: boolean;
    settings: Record<string, unknown>;
  }>;
  summary: {
    totalActions: number;
    enabledActions: number;
    wouldExecute: number;
  };
  testedAt: string;
}

export interface AdminMobileHooksActionTypeInfo {
  description: string;
  enabled: boolean;
  configured: boolean;
  warnings: string[];
  settings: Record<string, unknown>;
}

export interface AdminMobileHooksActionTypesResponse {
  actions: Record<string, AdminMobileHooksActionTypeInfo>;
}

export type AdminMobileHooksActionTypeSettingsUpdateRequest = Record<string, unknown> & {
  enabled?: boolean;
};

export interface AdminMobileHooksActionTypeSettingsUpdateResponse {
  actionType: string;
  settings: Record<string, unknown>;
  updated: string[];
  lastUpdated: string;
}

export interface AdminMobileHooksActionTypeTestRequest {
  actionType: string;
  dryRun?: boolean;
  testData?: Record<string, unknown>;
}

export interface AdminMobileHooksActionTypeTestResponse {
  actionType: string;
  enabled: boolean;
  dryRun: boolean;
  testPayload: Record<string, unknown>;
  execution: {
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  };
  settings: Record<string, unknown>;
  testedAt: string;
}

export interface AdminMobileHooksEmergencyStatusResponse {
  enabled: boolean;
  disabledAt: string | null;
  disabledReason: string | null;
}

export interface AdminMobileHooksEmergencyStatusUpdateRequest {
  enabled: boolean;
  reason?: string;
}

export interface AdminMobileHooksEmergencyStatusUpdateResponse {
  enabled: boolean;
  updatedAt: string;
  message: string;
}

export interface AdminMobileHooksHealthChecks {
  settingsLoaded: boolean;
  emergencyEnabled: boolean;
  analyticsActive: boolean;
  errorReportingActive: boolean;
  offlineStorageActive: boolean;
  performanceMonitoringActive: boolean;
}

export interface AdminMobileHooksHealthResponse {
  status: HealthStatus;
  healthScore: number;
  checks?: AdminMobileHooksHealthChecks;
  error?: string;
  timestamp: string;
}

export interface AdminMobileHooksRecentEventActionExecution {
  actionType: string;
  status: 'success' | 'failed' | 'skipped';
  errorMessage: string | null;
  executionTimeMs: number | null;
  executedAt: string;
  details?: Record<string, unknown>;
}

export interface AdminMobileHooksRecentEvent {
  eventId: string;
  eventType: string;
  userId: string | null;
  timestamp: string;
  processingStatus: MobileAnalyticsProcessingStatus;
  processingError: string | null;
  createdAt: string;
  updatedAt: string;
  actionExecutions: AdminMobileHooksRecentEventActionExecution[];
}

export interface AdminMobileHooksRecentEventsResponse {
  events: AdminMobileHooksRecentEvent[];
}

export type MobileAnalyticsStatsResponse = MobileAnalyticsStats;

export interface AdminHookSummary {
  id: number;
  name: string;
  description?: string;
  eventPattern: string;
  actionType: string;
  actionConfig?: Record<string, any>;
  isActive: boolean;
  priority: number;
  lastExecution?: string;
}

export interface AdminHookStats {
  totalHooks: number;
  activeHooks: number;
  executionsToday: number;
  lastReloadedAt?: string;
}

export interface AdminHookExecution {
  id: number;
  hookId: number;
  eventName: string;
  success: boolean;
  executionTimeMs: number;
  errorMessage?: string;
  executedAt: string;
}

export interface AdminHookExecutionResponse {
  executions: AdminHookExecution[];
  total: number;
  page: number;
  pageSize: number;
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
