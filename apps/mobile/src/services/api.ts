// Create API services from shared libraries with mobile-specific configurations
import { createApiClient, HttpClient, ApiClientConfig } from '@my-many-books/shared-api/';
import { authService } from './authService';
import NetInfo from '@react-native-community/netinfo';
import i18n from '../i18n';
import { operationQueue } from './OperationQueue';
import { isRetriableError } from './QueueExecutor';
import type { OperationType } from '../types/queue';

// Configure API base URL for mobile
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

// Fetch-based HTTP client for React Native
class FetchHttpClient implements HttpClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL?: string, timeout: number = 10000) {
    this.baseURL = baseURL || '';
    this.timeout = timeout;
  }

  private async fetchWithTimeout<T>(url: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    // Check network connectivity before making request
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      throw new Error(i18n.t('offline.errors.noConnection', { ns: 'offline' }));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle authentication errors (401 Unauthorized)
        // Try to refresh token and retry the request once
        if (response.status === 401 && !isRetry) {
          const refreshed = await authService.silentRefresh();

          if (refreshed) {
            // Get new token and retry the original request
            const newToken = await authService.getIdToken();
            const retryOptions = {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${newToken}`,
              },
            };
            return this.fetchWithTimeout<T>(url, retryOptions, true);
          }

          // Token refresh failed - logout user
          await authService.logout();
          throw new Error('Session expired. Please login again.');
        }

        // Handle authorization errors (403 Forbidden)
        // Error message is already localized by the API based on Accept-Language header
        if (response.status === 403) {
          const authError = {
            status: 403,
            isAuthorizationError: true,
            message: errorData.error || 'errors:permission_denied',
            details: errorData.details,
          };
          throw authError;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async get<T>(url: string, config?: any): Promise<T> {
    return this.fetchWithTimeout<T>(url, {
      method: 'GET',
      headers: config?.headers || {},
    });
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.fetchWithTimeout<T>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: JSON.stringify(data),
    });
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.fetchWithTimeout<T>(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: JSON.stringify(data),
    });
  }

  async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.fetchWithTimeout<T>(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: JSON.stringify(data),
    });
  }

  async delete<T>(url: string, config?: any): Promise<T> {
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
  getAuthToken: async () => {
    return await authService.getIdToken();
  },
  onUnauthorized: async () => {
    await authService.logout();
  },
};

// Create HTTP client and API client
const httpClient = new FetchHttpClient(apiConfig.baseURL, apiConfig.timeout);
const apiClient = createApiClient(httpClient, apiConfig);

/**
 * Wrapper for API write operations that automatically queues on retriable errors
 */
async function withQueueOnError<T>(
  operation: () => Promise<T>,
  operationType: OperationType,
  resource: 'book' | 'user' | 'settings',
  payload: any
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // If error is retriable, enqueue the operation
    if (isRetriableError(error)) {
      await operationQueue.enqueue(operationType, resource, payload, 5);
      // Re-throw to let caller know it failed
      throw error;
    }
    // Non-retriable error - fail immediately
    throw error;
  }
}

// Export API instances with bound methods
export const bookAPI = {
  searchBooks: apiClient.books.searchBooks.bind(apiClient.books),
  searchByISBN: apiClient.books.searchByISBN.bind(apiClient.books),
  getBooks: apiClient.books.getBooks.bind(apiClient.books),
  getBook: apiClient.books.getBook.bind(apiClient.books),

  // Write operations with automatic queueing
  createBook: async (book: any) => {
    return withQueueOnError(
      () => apiClient.books.createBook(book),
      'CREATE',
      'book',
      {
        ...book,
        // Ensure temp ID is preserved for queue processing
        id: book.id || book._tempId,
        _tempId: book._tempId || book.id,
      }
    );
  },

  updateBook: async (id: string, book: any) => {
    return withQueueOnError(
      () => apiClient.books.updateBook(id, book),
      'UPDATE',
      'book',
      { id, ...book }
    );
  },

  deleteBook: async (id: string) => {
    return withQueueOnError(
      () => apiClient.books.deleteBook(id),
      'DELETE',
      'book',
      { id }
    );
  },

  updateBookStatus: apiClient.books.updateBookStatus.bind(apiClient.books),
};

export const userAPI = {
  getCurrentUser: apiClient.users.getCurrentUser.bind(apiClient.users),
  updateProfile: apiClient.users.updateProfile.bind(apiClient.users),
  deleteAccount: apiClient.users.deleteAccount.bind(apiClient.users),
  login: apiClient.users.login.bind(apiClient.users),
  register: apiClient.users.register.bind(apiClient.users),
  logout: apiClient.users.logout.bind(apiClient.users),
  refreshToken: apiClient.users.refreshToken.bind(apiClient.users),
};

export const adminAPI = {
  getAdminStats: apiClient.admin.getAdminStats.bind(apiClient.admin),
  getAdminUsers: apiClient.admin.getAdminUsers.bind(apiClient.admin),
  updateAdminUser: apiClient.admin.updateAdminUser.bind(apiClient.admin),
  deleteAdminUser: apiClient.admin.deleteAdminUser.bind(apiClient.admin),
  getAdminBooks: apiClient.admin.getAdminBooks.bind(apiClient.admin),
  updateAdminBook: apiClient.admin.updateAdminBook.bind(apiClient.admin),
  deleteAdminBook: apiClient.admin.deleteAdminBook.bind(apiClient.admin),
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

  handleOfflineError: async (error: any) => {
    // Handle offline scenarios
    const online = await apiUtils.isOnline();
    if (!online) {
      throw new Error(i18n.t('offline.errors.noConnection', { ns: 'offline' }));
    }
    throw error;
  },

  isOfflineError: (error: any): boolean => {
    return error?.message === i18n.t('offline.errors.noConnection', { ns: 'offline' });
  },
};