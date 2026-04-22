// Create API services from shared libraries with mobile-specific configurations
import { createApiClient, HttpClient, ApiClientConfig, RequestConfig } from '@my-many-books/shared-api';
import { authService } from './authService';
import NetInfo from '@react-native-community/netinfo';
import i18n from '../i18n';
import { operationQueue } from './OperationQueue';
import { isRetriableError } from './QueueExecutor';
import { OPERATION_TYPES, RESOURCE_TYPES } from './hooks/eventsSchema';
import type { OperationType } from './hooks/eventsSchema';
import type { BookOperationPayload, UserOperationPayload, SettingsOperationPayload } from '../types/queue';
import type { BookFormData } from '@my-many-books/shared-types';
import type { MobileBookCreateData } from '../types';
import { API_BASE_URL } from '../config/api';
import type { Category } from '@my-many-books/shared-types';
import {
  ApiError,
  ErrorCode,
  getClientErrorCode
} from '../types/errors';

// Fetch-based HTTP client for React Native
class FetchHttpClient implements HttpClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL?: string, timeout: number = 10000) {
    this.baseURL = baseURL || '';
    this.timeout = timeout;
  }

  private extractErrorPayload(errorData: unknown): {
    code?: string;
    message?: string;
    details?: unknown;
  } {
    if (!errorData || typeof errorData !== 'object') {
      return {};
    }

    const maybeError = (errorData as { error?: unknown }).error;
    if (typeof maybeError === 'string') {
      return { message: maybeError };
    }

    if (maybeError && typeof maybeError === 'object') {
      const typed = maybeError as { code?: unknown; message?: unknown; details?: unknown };
      return {
        ...(typeof typed.code === 'string' && { code: typed.code }),
        ...(typeof typed.message === 'string' && { message: typed.message }),
        ...(typed.details !== undefined && { details: typed.details }),
      };
    }

    return {};
  }

  private unwrapSuccessEnvelope<T>(payload: unknown): T {
    if (payload && typeof payload === 'object' && 'success' in payload) {
      const envelope = payload as { success?: unknown; data?: T };

      if (envelope.success === true && 'data' in envelope) {
        return envelope.data as T;
      }

      if (envelope.success === false) {
        const parsedError = this.extractErrorPayload(payload);
        throw new ApiError(
          ErrorCode.HTTP_CLIENT_ERROR,
          parsedError.message || 'API request failed'
        );
      }
    }

    throw new ApiError(
      ErrorCode.HTTP_SERVER_ERROR,
      'Invalid API success envelope'
    );
  }

  private async fetchWithTimeout<T>(url: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    // Check network connectivity before making request
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      throw new ApiError(ErrorCode.NETWORK_OFFLINE, i18n.t('offline.errors.noConnection', { ns: 'offline' }));
    }

    const token = await authService.getIdToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 204 No Content is the only successful response that intentionally has no envelope body.
      if (response.status === 204) {
        return undefined as T;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const parsedError = this.extractErrorPayload(errorData);

        // Handle authentication errors (401 Unauthorized)
        // Try to refresh token and retry the request once
        if (response.status === 401 && !isRetry) {
          const refreshed = await authService.silentRefresh();

          if (refreshed) {
            return this.fetchWithTimeout<T>(url, options, true);
          }

          // Token refresh failed - logout user
          await authService.logout();
          const { default: i18n } = await import('../i18n');
          throw new Error(i18n.t('errors.sessionExpired', { ns: 'offline' }));
        }

        // Handle authorization errors (403 Forbidden)
        // API returns error codes - client handles translation
        if (response.status === 403) {
          const errorCode = parsedError.code;
          const authError = {
            status: 403,
            isAuthorizationError: true,
            code: errorCode,
            message: errorCode
              ? i18n.t(`errors:${errorCode}`, { defaultValue: parsedError.message || 'Permission denied' })
              : parsedError.message || 'Permission denied',
            details: parsedError.details,
          };
          throw authError;
        }

        // Create structured error based on status code
        if (response.status >= 500) {
          throw new ApiError(ErrorCode.HTTP_SERVER_ERROR, `HTTP ${response.status}: ${response.statusText}`, response.status);
        } else {
          const code = getClientErrorCode(response.status);
          throw new ApiError(code, parsedError.message || `HTTP ${response.status}: ${response.statusText}`, response.status);
        }
      }

      const payload = await response.json().catch(() => null);
      return this.unwrapSuccessEnvelope<T>(payload);
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Convert generic errors to ApiError if they're not already
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Handle AbortController timeout
      if (error.name === 'AbortError') {
        throw new ApiError(ErrorCode.NETWORK_TIMEOUT, 'Request timeout');
      }
      
      // Handle other network errors
      if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
        throw new ApiError(ErrorCode.NETWORK_FAILED, error.message || 'Network request failed');
      }
      
      // Re-throw unknown errors as generic Error (for third-party compatibility)
      throw error;
    }
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    let finalUrl = url;
    
    // Handle query parameters for GET requests
    if (config?.params) {
      const params = new URLSearchParams();
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        finalUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
      }
    }

    return this.fetchWithTimeout<T>(finalUrl, {
      method: 'GET',
      headers: config?.headers || {},
    });
  }

  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.fetchWithTimeout<T>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: JSON.stringify(data),
    });
  }

  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.fetchWithTimeout<T>(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: JSON.stringify(data),
    });
  }

  async patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.fetchWithTimeout<T>(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: JSON.stringify(data),
    });
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.fetchWithTimeout<T>(url, {
      method: 'DELETE',
      headers: config?.headers || {},
    });
  }
}

// Create API client configuration
const apiConfig: ApiClientConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  onUnauthorized: async () => {
    await authService.logout();
  },
};

// Create HTTP client and API client
const httpClient = new FetchHttpClient(apiConfig.baseURL, apiConfig.timeout);
const apiClient = createApiClient(httpClient, apiConfig);

type MobileCategoriesCacheState = {
  userKey: string | null;
  data: Category[] | null;
};

type MobileCategoriesInFlightState = {
  userKey: string | null;
  promise: Promise<Category[]> | null;
};

const mobileCategoriesCache: MobileCategoriesCacheState = {
  userKey: null,
  data: null,
};

const mobileCategoriesInFlight: MobileCategoriesInFlightState = {
  userKey: null,
  promise: null,
};

const invalidateMobileCategoriesCache = (): void => {
  mobileCategoriesCache.userKey = null;
  mobileCategoriesCache.data = null;
  mobileCategoriesInFlight.userKey = null;
  mobileCategoriesInFlight.promise = null;
};

const getMobileCategoriesCacheUserKey = async (): Promise<string> => {
  try {
    const user = await authService.getCurrentUser();
    if (user?.id != null) {
      return `user:${String(user.id)}`;
    }
  } catch {
    // Best-effort cache scoping. Fall back to anonymous if auth user cannot be read.
  }
  return 'anonymous';
};

const getCategoriesWithMobileCache = async (lastSyncTime?: string): Promise<Category[]> => {
  // Sync/incremental fetches must always hit the API.
  if (lastSyncTime) {
    return apiClient.categories.getCategories(lastSyncTime);
  }

  const userKey = await getMobileCategoriesCacheUserKey();

  if (mobileCategoriesCache.data && mobileCategoriesCache.userKey === userKey) {
    return [...mobileCategoriesCache.data];
  }

  if (mobileCategoriesInFlight.promise && mobileCategoriesInFlight.userKey === userKey) {
    const data = await mobileCategoriesInFlight.promise;
    return [...data];
  }

  const requestPromise = apiClient.categories.getCategories();
  mobileCategoriesInFlight.userKey = userKey;
  mobileCategoriesInFlight.promise = requestPromise;

  try {
    const categories = await requestPromise;
    const cached = [...categories];
    mobileCategoriesCache.userKey = userKey;
    mobileCategoriesCache.data = cached;
    return [...cached];
  } finally {
    if (mobileCategoriesInFlight.userKey === userKey) {
      mobileCategoriesInFlight.userKey = null;
      mobileCategoriesInFlight.promise = null;
    }
  }
};

// Export raw apiClient for internal use (e.g., QueueExecutor)
export { apiClient };

/**
 * Wrapper for API write operations that automatically queues on retriable errors
 */
async function withQueueOnError<T>(
  operation: () => Promise<T>,
  operationType: OperationType,
  resource: 'book' | 'user' | 'settings',
  payload: unknown,
  maxRetries?: number
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // If error is retriable, enqueue the operation
    if (isRetriableError(error)) {
      const retries = maxRetries ?? (operationType === OPERATION_TYPES.CREATE ? 5 : 3);
      if (resource === RESOURCE_TYPES.BOOK) {
        await operationQueue.enqueue(operationType, RESOURCE_TYPES.BOOK, payload as BookOperationPayload, retries);
      } else if (resource === RESOURCE_TYPES.USER) {
        await operationQueue.enqueue(operationType, RESOURCE_TYPES.USER, payload as UserOperationPayload, retries);
      } else {
        await operationQueue.enqueue(operationType, RESOURCE_TYPES.SETTINGS, payload as SettingsOperationPayload, retries);
      }
      // Re-throw to let caller know it failed
      throw error;
    }
    // Non-retriable error - fail immediately
    throw error;
  }
}

/**
 * Book API with automatic offline queueing.
 *
 * This is the ACTIVE pattern used throughout the app for book operations.
 * Write operations (create, update, delete) are wrapped with withQueueOnError
 * to automatically queue failed requests for later retry.
 *
 * Note: Alternative handler-based approach exists in handlers/BookHandlers.ts
 * but is not currently integrated. See docs/ARCHITECTURE_OVERVIEW.md for comparison.
 */
export const bookAPI = {
  searchBooks: apiClient.books.searchBooks.bind(apiClient.books),
  searchByISBN: apiClient.books.searchByISBN.bind(apiClient.books),
  getBooks: apiClient.books.getBooks.bind(apiClient.books),
  getBook: apiClient.books.getBook.bind(apiClient.books),

  // Write operations with automatic queueing
  createBook: async (book: MobileBookCreateData) => {
    return withQueueOnError(
      () => apiClient.books.createBook(book),
      OPERATION_TYPES.CREATE,
      RESOURCE_TYPES.BOOK,
      { ...book, id: book._tempId }
    );
  },

  updateBook: async (id: string, book: unknown) => {
    const bookData = book as Record<string, unknown>;
    return withQueueOnError(
      () => apiClient.books.updateBook(Number(id), bookData as Partial<BookFormData>),
      OPERATION_TYPES.UPDATE,
      RESOURCE_TYPES.BOOK,
      { id, ...bookData }
    );
  },

  deleteBook: async (id: string) =>
    withQueueOnError(
      () => apiClient.books.deleteBook(Number(id)),
      OPERATION_TYPES.DELETE,
      RESOURCE_TYPES.BOOK,
      { id }
    ),

  updateBookStatus: apiClient.books.updateBookStatus.bind(apiClient.books),
};

export const userAPI = {
  getCurrentUser: apiClient.users.getCurrentUser.bind(apiClient.users),
  updateProfile: apiClient.users.updateProfile.bind(apiClient.users),
  deleteAccount: apiClient.users.deleteAccount.bind(apiClient.users),
};

export const authorAPI = {
  getAuthors: apiClient.authors.getAuthors.bind(apiClient.authors),
  getAuthor: apiClient.authors.getAuthor.bind(apiClient.authors),
  createAuthor: apiClient.authors.createAuthor.bind(apiClient.authors),
  updateAuthor: apiClient.authors.updateAuthor.bind(apiClient.authors),
  deleteAuthor: apiClient.authors.deleteAuthor.bind(apiClient.authors),
};

export const categoryAPI = {
  getCategories: getCategoriesWithMobileCache,
  getCategory: apiClient.categories.getCategory.bind(apiClient.categories),
  createCategory: async (data: { name: string }) => {
    const created = await apiClient.categories.createCategory(data);
    invalidateMobileCategoriesCache();
    return created;
  },
  updateCategory: async (id: number, data: Partial<{ name: string }>) => {
    const updated = await apiClient.categories.updateCategory(id, data);
    invalidateMobileCategoriesCache();
    return updated;
  },
  deleteCategory: async (id: number) => {
    await apiClient.categories.deleteCategory(id);
    invalidateMobileCategoriesCache();
  },
};

export const adminAPI = {
  getAdminStats: <T = unknown>() =>
    httpClient.get<T>(`${API_BASE_URL}/admin/stats/summary`),
  getAdminUsers: <T = unknown>(page = 1, limit = 10, search?: string) =>
    httpClient.get<T>(`${API_BASE_URL}/admin/users`, { params: { page, limit, ...(search ? { search } : {}) } }),
  updateAdminUser: (id: number, data: Record<string, unknown>) =>
    httpClient.put(`${API_BASE_URL}/admin/users/${id}`, data),
  deleteAdminUser: (id: number) =>
    httpClient.delete(`${API_BASE_URL}/admin/users/${id}`),
  getAdminBooks: <T = unknown>(page = 1, limit = 10, search?: string) =>
    httpClient.get<T>(`${API_BASE_URL}/admin/books`, { params: { page, limit, ...(search ? { search } : {}) } }),
  updateAdminBook: (id: number, data: Record<string, unknown>) =>
    httpClient.put(`${API_BASE_URL}/admin/books/${id}`, data),
  deleteAdminBook: (id: number) =>
    httpClient.delete(`${API_BASE_URL}/admin/books/${id}`),
};

// Mobile-specific API utilities
export const apiUtils = {
  isOnline: async () => {
    const networkState = await NetInfo.fetch();
    return networkState.isConnected ?? false;
  },

  getAuthHeaders: () => {
    // Get auth headers for requests
    return {
      'Content-Type': 'application/json',
    };
  },

  handleOfflineError: async (error: unknown) => {
    // Handle offline scenarios
    const online = await apiUtils.isOnline();
    if (!online) {
      throw new Error(i18n.t('offline.errors.noConnection', { ns: 'offline' }));
    }
    throw error;
  },

  isOfflineError: (error: unknown): boolean =>
    error instanceof Error &&
    error.message === i18n.t('offline.errors.noConnection', { ns: 'offline' }),
};
