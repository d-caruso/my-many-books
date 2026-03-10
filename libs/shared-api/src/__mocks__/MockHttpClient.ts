import { HttpClient, RequestConfig } from '../base-client';

export interface MockResponse<T = unknown> {
  data: T;
  status: number;
  headers?: Record<string, string>;
}

export interface RequestCapture {
  method: string;
  url: string;
  data?: unknown;
  config?: RequestConfig;
}

interface MockHttpError extends Error {
  status: number;
  response: MockResponse<unknown>;
}

/**
 * Mock HTTP client for testing purposes.
 * Captures all requests and returns configurable responses.
 */
export class MockHttpClient implements HttpClient {
  private responses: Map<string, MockResponse> = new Map();
  private requests: RequestCapture[] = [];
  private defaultResponse: MockResponse = {
    data: {},
    status: 200,
  };

  /**
   * Configure a response for a specific URL pattern
   */
  setResponse<T>(urlPattern: string, response: MockResponse<T>): void {
    this.responses.set(urlPattern, response);
  }

  /**
   * Set the default response for all requests
   */
  setDefaultResponse<T>(response: MockResponse<T>): void {
    this.defaultResponse = response;
  }

  /**
   * Get all captured requests
   */
  getRequests(): RequestCapture[] {
    return this.requests;
  }

  /**
   * Get the last captured request
   */
  getLastRequest(): RequestCapture | undefined {
    return this.requests[this.requests.length - 1];
  }

  /**
   * Clear all captured requests
   */
  clearRequests(): void {
    this.requests = [];
  }

  /**
   * Clear all configured responses
   */
  clearResponses(): void {
    this.responses.clear();
  }

  /**
   * Reset both requests and responses
   */
  reset(): void {
    this.clearRequests();
    this.clearResponses();
  }

  private captureRequest(
    method: string,
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): void {
    this.requests.push({ method, url, data, config });
  }

  private getResponse<T>(url: string): MockResponse<T> {
    // Check for exact match first
    if (this.responses.has(url)) {
      return this.responses.get(url) as MockResponse<T>;
    }

    // Check for pattern match
    for (const [pattern, response] of this.responses.entries()) {
      if (url.includes(pattern)) {
        return response as MockResponse<T>;
      }
    }

    return this.defaultResponse as MockResponse<T>;
  }

  private handleResponse<T>(response: MockResponse<T>): Promise<T> {
    if (response.status >= 400) {
      const error = new Error(`HTTP Error ${response.status}`) as MockHttpError;
      error.status = response.status;
      error.response = response;
      return Promise.reject(error);
    }
    return Promise.resolve(response.data);
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    this.captureRequest('GET', url, undefined, config);
    const response = this.getResponse<T>(url);
    return this.handleResponse(response);
  }

  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    this.captureRequest('POST', url, data, config);
    const response = this.getResponse<T>(url);
    return this.handleResponse(response);
  }

  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    this.captureRequest('PUT', url, data, config);
    const response = this.getResponse<T>(url);
    return this.handleResponse(response);
  }

  async patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    this.captureRequest('PATCH', url, data, config);
    const response = this.getResponse<T>(url);
    return this.handleResponse(response);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    this.captureRequest('DELETE', url, undefined, config);
    const response = this.getResponse<T>(url);
    return this.handleResponse(response);
  }
}

/**
 * Create a new MockHttpClient instance
 */
export function createMockHttpClient(): MockHttpClient {
  return new MockHttpClient();
}
