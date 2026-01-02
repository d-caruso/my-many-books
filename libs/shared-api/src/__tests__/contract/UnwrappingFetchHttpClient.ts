import { HttpClient, RequestConfig } from '../../base-client';

const toSearchParams = (params?: Record<string, unknown>): string => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    searchParams.set(key, String(value));
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
};

const maybeUnwrapApiResponse = (data: unknown): unknown => {
  if (
    data &&
    typeof data === 'object' &&
    'success' in data &&
    (data as any).success === true &&
    'data' in data &&
    (data as any).data !== undefined
  ) {
    return (data as any).data;
  }
  return data;
};

export class UnwrappingFetchHttpClient implements HttpClient {
  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    const qs = method === 'GET' ? toSearchParams(config?.params) : '';
    const response = await fetch(`${url}${qs}`, {
      method,
      headers: config?.headers,
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error: any = new Error(`HTTP Error ${response.status}`);
      error.status = response.status;
      error.response = response;
      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const json = (await response.json()) as unknown;
    return maybeUnwrapApiResponse(json) as T;
  }

  get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('GET', url, undefined, config);
  }

  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('POST', url, data, config);
  }

  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PUT', url, data, config);
  }

  patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PATCH', url, data, config);
  }

  delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('DELETE', url, undefined, config);
  }
}

