/**
 * Platform-agnostic HTTP client base
 * Works with both web (axios/fetch) and React Native
 */

const DEFAULT_TIMEOUT_MS = 10000;
const CONTENT_TYPE_HEADER = 'Content-Type';
const CONTENT_TYPE_JSON = 'application/json';
const AUTHORIZATION_HEADER = 'Authorization';
const BEARER_PREFIX = 'Bearer ';

export const HTTP_STATUS_UNAUTHORIZED = 401;
export const HTTP_STATUS_NOT_FOUND = 404;

export type RequestParamValue = string | number | boolean | null | undefined;

export interface HttpClient {
  get<T>(url: string, config?: RequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  delete<T>(url: string, config?: RequestConfig): Promise<T>;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  params?: Record<string, RequestParamValue>;
}

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  getAuthToken?: () => string | null;
  onUnauthorized?: () => void;
}

export class BaseApiClient {
  constructor(
    private httpClient: HttpClient,
    private config: ApiClientConfig
  ) {}

  protected getErrorStatus(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) {
      return undefined;
    }

    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }

  protected async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      [CONTENT_TYPE_HEADER]: CONTENT_TYPE_JSON,
      ...(config?.headers ?? {}),
    };

    const requestConfig: RequestConfig = {
      timeout: config?.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT_MS,
      params: config?.params,
      headers,
    };

    const token = this.config.getAuthToken?.();
    if (token) {
      headers[AUTHORIZATION_HEADER] = `${BEARER_PREFIX}${token}`;
    }

    try {
      switch (method) {
        case 'GET':
          return await this.httpClient.get<T>(url, requestConfig);
        case 'POST':
          return await this.httpClient.post<T>(url, data, requestConfig);
        case 'PUT':
          return await this.httpClient.put<T>(url, data, requestConfig);
        case 'PATCH':
          return await this.httpClient.patch<T>(url, data, requestConfig);
        case 'DELETE':
          return await this.httpClient.delete<T>(url, requestConfig);
      }
    } catch (error: unknown) {
      if (this.getErrorStatus(error) === HTTP_STATUS_UNAUTHORIZED) {
        this.config.onUnauthorized?.();
      }
      throw error;
    }
  }

  protected get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, config);
  }

  protected post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('POST', endpoint, data, config);
  }

  protected put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PUT', endpoint, data, config);
  }

  protected patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, config);
  }

  protected delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, config);
  }

  public setBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL;
  }
}
