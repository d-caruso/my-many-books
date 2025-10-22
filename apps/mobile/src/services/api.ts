// Create API services from shared libraries with mobile-specific configurations
import { createApiClient, HttpClient, ApiClientConfig } from '@my-many-books/shared-api/';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure API base URL for mobile
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

// In-memory token storage for synchronous access
let authToken: string | null = null;

// Initialize token from AsyncStorage
AsyncStorage.getItem('authToken').then((token) => {
  authToken = token;
});

// Fetch-based HTTP client for React Native
class FetchHttpClient implements HttpClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL?: string, timeout: number = 10000) {
    this.baseURL = baseURL || '';
    this.timeout = timeout;
  }

  private async fetchWithTimeout<T>(url: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
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
  getAuthToken: () => authToken,
  onUnauthorized: () => {
    // Clear token on unauthorized access
    authToken = null;
    AsyncStorage.removeItem('authToken');
    // TODO: Implement navigation to login screen
    console.warn('Unauthorized access');
  },
};

// Create HTTP client and API client
const httpClient = new FetchHttpClient(apiConfig.baseURL, apiConfig.timeout);
const apiClient = createApiClient(httpClient, apiConfig);

// Helper to update auth token in memory when it changes
export const updateAuthToken = async (token: string | null) => {
  authToken = token;
  if (token) {
    await AsyncStorage.setItem('authToken', token);
  } else {
    await AsyncStorage.removeItem('authToken');
  }
};

// Export API instances with bound methods
export const bookAPI = {
  searchBooks: apiClient.books.searchBooks.bind(apiClient.books),
  searchByISBN: apiClient.books.searchByISBN.bind(apiClient.books),
  getBooks: apiClient.books.getBooks.bind(apiClient.books),
  getBook: apiClient.books.getBook.bind(apiClient.books),
  createBook: apiClient.books.createBook.bind(apiClient.books),
  updateBook: apiClient.books.updateBook.bind(apiClient.books),
  deleteBook: apiClient.books.deleteBook.bind(apiClient.books),
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

// Mobile-specific API utilities
export const apiUtils = {
  isOnline: () => {
    // In a real app, you'd check network connectivity
    return true;
  },
  
  getAuthHeaders: () => {
    // Get auth headers for requests
    return {
      'Content-Type': 'application/json',
    };
  },
  
  handleOfflineError: (error: any) => {
    // Handle offline scenarios
    if (!apiUtils.isOnline()) {
      throw new Error('You are offline. Please check your internet connection.');
    }
    throw error;
  },
};