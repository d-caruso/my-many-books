import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import i18n from 'i18next';
import { authService } from './authService';
import type { HttpClient, RequestConfig } from '@my-many-books/shared-api';

export class AxiosHttpClient implements HttpClient {
  private axios;

  constructor(baseURL?: string, timeout?: number) {
    // NOTE: We don't pass baseURL to axios.create() because shared-api's BaseApiClient
    // constructs full URLs by prepending baseURL to endpoints. Axios should receive
    // complete URLs, not relative paths. This is the industry standard for layered APIs.
    this.axios = axios.create({
      timeout,
      withCredentials: true, // Send cookies for refresh token
    });

    const unwrapSuccessEnvelope = <T>(payload: unknown): T => {
      if (
        payload &&
        typeof payload === 'object' &&
        'success' in payload &&
        (payload as { success?: unknown }).success === true &&
        'data' in payload
      ) {
        return (payload as { data: T }).data;
      }

      throw new Error(
        i18n.t('common:errors.invalid_response_envelope', {
          defaultValue: 'Invalid API success envelope',
        })
      );
    };

    // Add request interceptor for auth token
    this.axios.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
      const token = await authService.getIdToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response: AxiosResponse) => {
        if (response.status === 204) {
          return response.data;
        }

        return unwrapSuccessEnvelope(response.data);
      },
      async (error: AxiosError) => {
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
            if (error.config) {
              error.config.headers.Authorization = `Bearer ${token}`;
              return this.axios.request(error.config);
            }
          }

          // Redirect to login if refresh fails
          if (typeof window !== 'undefined' && import.meta.env.MODE !== 'test') {
            window.location.href = '/auth';
          }
        }

        // Handle authorization errors (403 Forbidden)
        // API returns error codes - client handles translation
        if (error.response?.status === 403) {
          const errorData = error.response?.data as Record<string, unknown> | undefined;
          const errorInfo = errorData?.error;
          const authError = {
            ...error,
            isAuthorizationError: true,
            code: typeof errorInfo === 'object' && errorInfo !== null && 'code' in errorInfo
              ? (errorInfo as Record<string, unknown>).code
              : undefined,
            message: typeof errorInfo === 'object' && errorInfo !== null && 'message' in errorInfo
              ? String((errorInfo as Record<string, unknown>).message)
              : 'Permission denied',
            details: typeof errorInfo === 'object' && errorInfo !== null && 'details' in errorInfo
              ? (errorInfo as Record<string, unknown>).details
              : undefined,
          };
          return Promise.reject(authError);
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.axios.get(url, config);
  }

  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.axios.post(url, data, config);
  }

  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.axios.put(url, data, config);
  }

  async patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.axios.patch(url, data, config);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.axios.delete(url, config);
  }
}
