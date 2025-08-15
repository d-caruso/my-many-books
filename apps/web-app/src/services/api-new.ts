/**
 * New API service using shared-api library
 * This will eventually replace the current api.ts file
 */

import { createApiClient, HttpClient, ApiClientConfig } from '@my-many-books/shared-api';

// Axios adapter for web platform
class AxiosHttpClient implements HttpClient {
  private axios = require('axios').create();

  constructor() {
    // Add request interceptor for auth token
    this.axios.interceptors.request.use((config: any) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response: any) => response.data,
      (error: any) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
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

  async delete<T>(url: string, config?: any): Promise<T> {
    return this.axios.delete(url, config);
  }
}

// Create API client configuration
const apiConfig: ApiClientConfig = {
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
  getAuthToken: () => localStorage.getItem('authToken'),
  onUnauthorized: () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  },
};

// Create and export the API client
export const apiClient = createApiClient(new AxiosHttpClient(), apiConfig);

// Export individual API modules for convenience
export const bookAPI = apiClient.books;
export const authorAPI = apiClient.authors;
export const categoryAPI = apiClient.categories;
export const userAPI = apiClient.users;