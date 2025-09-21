/**
 * Platform-agnostic HTTP client base
 * Works with both web (axios/fetch) and React Native
 */

export interface HttpClient {
  get<T>(url: string, config?: RequestConfig): Promise<T>;
  post<T>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  put<T>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  delete<T>(url: string, config?: RequestConfig): Promise<T>;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  params?: Record<string, any>;
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

  protected async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`;
    const requestConfig: RequestConfig = {
      timeout: this.config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      ...config,
    };

    // Add auth token if available
    const token = this.config.getAuthToken?.();
    if (token) {
      requestConfig.headers!['Authorization'] = `Bearer ${token}`;
    }

    try {
      switch (method) {
        case 'GET':
          return await this.httpClient.get<T>(url, requestConfig);
        case 'POST':
          return await this.httpClient.post<T>(url, data, requestConfig);
        case 'PUT':
          return await this.httpClient.put<T>(url, data, requestConfig);
        case 'DELETE':
          return await this.httpClient.delete<T>(url, requestConfig);
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
    } catch (error: any) {
      if (error.status === 401 && this.config.onUnauthorized) {
        this.config.onUnauthorized();
      }
      throw error;
    }
  }

  protected get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, config);
  }

  protected post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>('POST', endpoint, data, config);
  }

  protected put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>('PUT', endpoint, data, config);
  }

  protected delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('DELETE', endpoint, config);
  }

  public setBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL;
  }
}