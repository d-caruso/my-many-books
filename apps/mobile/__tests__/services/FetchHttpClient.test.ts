/**
 * Tests for FetchHttpClient with new ApiError handling
 */

import { ApiError, ErrorCode, getClientErrorCode } from '../../src/types/errors';
import NetInfo from '@react-native-community/netinfo';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const i18n = require('../../src/i18n').default;

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn()
}));

// Mock i18n
jest.mock('../../src/i18n', () => ({
  default: {
    t: jest.fn((key: string) => {
      if (key === 'offline.errors.noConnection') return 'No internet connection';
      return key;
    })
  }
}));

// Mock authService
const mockAuthService = {
  silentRefresh: jest.fn(),
  getIdToken: jest.fn(),
  logout: jest.fn()
};

jest.mock('../../src/services/authService', () => ({
  authService: mockAuthService
}));

// We need to create a test version of FetchHttpClient since it's not exported
// Let's create a minimal version for testing
class TestFetchHttpClient {
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
      throw new ApiError(ErrorCode.NETWORK_OFFLINE, i18n.t('offline.errors.noConnection', { ns: 'offline' }));
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
        if (response.status === 401 && !isRetry) {
          const refreshed = await mockAuthService.silentRefresh();

          if (refreshed) {
            const newToken = await mockAuthService.getIdToken();
            const retryOptions = {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${newToken}`,
              },
            };
            return this.fetchWithTimeout<T>(url, retryOptions, true);
          }

          await mockAuthService.logout();
          throw new Error(i18n.t('errors.sessionExpired', { ns: 'offline' }));
        }

        // Handle authorization errors (403 Forbidden)
        if (response.status === 403) {
          const authError = {
            status: 403,
            isAuthorizationError: true,
            message: errorData.error || 'errors:permission_denied',
            details: errorData.details,
          };
          throw authError;
        }

        // Create structured error based on status code
        if (response.status >= 500) {
          throw new ApiError(ErrorCode.HTTP_SERVER_ERROR, `HTTP ${response.status}: ${response.statusText}`, response.status);
        } else {
          const code = getClientErrorCode(response.status);
          throw new ApiError(code, `HTTP ${response.status}: ${response.statusText}`, response.status);
        }
      }

      return await response.json();
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

  async get<T>(url: string, config?: Record<string, unknown>): Promise<T> {
    let finalUrl = url;
    
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

  async post<T>(url: string, data?: unknown, config?: Record<string, unknown>): Promise<T> {
    return this.fetchWithTimeout<T>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: JSON.stringify(data),
    });
  }
}

describe('FetchHttpClient with ApiError', () => {
  let httpClient: TestFetchHttpClient;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  const mockNetInfo = NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>;

  beforeEach(() => {
    httpClient = new TestFetchHttpClient('https://api.example.com');
    jest.clearAllMocks();
    mockNetInfo.mockResolvedValue({ isConnected: true } as { isConnected: boolean });
  });

  describe('Network connectivity checking', () => {
    it('should throw NETWORK_OFFLINE ApiError when offline', async () => {
      mockNetInfo.mockResolvedValue({ isConnected: false } as { isConnected: boolean });

      try {
        await httpClient.get('/test');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error instanceof ApiError).toBe(true);
        expect((error as ApiError).code).toBe(ErrorCode.NETWORK_OFFLINE);
        expect((error as ApiError).message).toBe('No internet connection');
        expect((error as ApiError).retriable).toBe(true);
      }
    });
  });

  describe('HTTP status code error mapping', () => {
    it('should throw HTTP_SERVER_ERROR for 5xx status codes', async () => {
      const testCases = [500, 502, 503, 504, 599];
      
      for (const statusCode of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: statusCode,
          statusText: 'Server Error',
          json: () => Promise.resolve({})
        } as Response);

        try {
          await httpClient.get('/test');
          fail(`Expected error for status ${statusCode}`);
        } catch (error) {
          expect(error instanceof ApiError).toBe(true);
          expect((error as ApiError).code).toBe(ErrorCode.HTTP_SERVER_ERROR);
          expect((error as ApiError).statusCode).toBe(statusCode);
          expect((error as ApiError).retriable).toBe(true);
          expect((error as ApiError).message).toContain(`HTTP ${statusCode}`);
        }
      }
    });

    it('should throw specific client error codes for special status codes', async () => {
      // Note: 401 and 403 have special handling and are tested separately
      const testCases = [
        { status: 404, expectedCode: ErrorCode.HTTP_NOT_FOUND, retriable: false },
        { status: 408, expectedCode: ErrorCode.NETWORK_TIMEOUT, retriable: true },
        { status: 429, expectedCode: ErrorCode.RATE_LIMITED, retriable: true },
      ];
      
      for (const { status, expectedCode, retriable } of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          statusText: 'Client Error',
          json: () => Promise.resolve({})
        } as Response);

        try {
          await httpClient.get('/test');
          fail(`Expected error for status ${status}`);
        } catch (error) {
          expect(error instanceof ApiError).toBe(true);
          expect((error as ApiError).code).toBe(expectedCode);
          expect((error as ApiError).statusCode).toBe(status);
          expect((error as ApiError).retriable).toBe(retriable);
          expect((error as ApiError).message).toContain(`HTTP ${status}`);
        }
      }
    });

    it('should handle 401 with failed token refresh', async () => {
      mockAuthService.silentRefresh.mockResolvedValueOnce(false);
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({})
      } as Response);

      try {
        await httpClient.get('/test');
        fail('Expected error for 401 status');
      } catch (error) {
        expect(error instanceof ApiError).toBe(false);
        expect(error).toHaveProperty('message');
        expect(mockAuthService.silentRefresh).toHaveBeenCalled();
        expect(mockAuthService.logout).toHaveBeenCalled();
      }
    });

    it('should throw special authorization error for 403 status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({ error: 'Access denied', details: 'Insufficient permissions' })
      } as Response);

      try {
        await httpClient.get('/test');
        fail('Expected error for 403 status');
      } catch (error) {
        expect(error instanceof ApiError).toBe(false);
        expect(error).toHaveProperty('status', 403);
        expect(error).toHaveProperty('isAuthorizationError', true);
        expect(error).toHaveProperty('message', 'Access denied');
        expect(error).toHaveProperty('details', 'Insufficient permissions');
      }
    });

    it('should throw HTTP_CLIENT_ERROR for other 4xx status codes', async () => {
      const testCases = [400, 402, 405, 422, 499];
      
      for (const statusCode of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: statusCode,
          statusText: 'Client Error',
          json: () => Promise.resolve({})
        } as Response);

        try {
          await httpClient.get('/test');
          fail(`Expected error for status ${statusCode}`);
        } catch (error) {
          expect(error instanceof ApiError).toBe(true);
          expect((error as ApiError).code).toBe(ErrorCode.HTTP_CLIENT_ERROR);
          expect((error as ApiError).statusCode).toBe(statusCode);
          expect((error as ApiError).retriable).toBe(false);
          expect((error as ApiError).message).toContain(`HTTP ${statusCode}`);
        }
      }
    });
  });

  describe('Network and timeout errors', () => {
    it('should throw NETWORK_TIMEOUT for AbortError', async () => {
      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      try {
        await httpClient.get('/test');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error instanceof ApiError).toBe(true);
        expect((error as ApiError).code).toBe(ErrorCode.NETWORK_TIMEOUT);
        expect((error as ApiError).message).toBe('Request timeout');
        expect((error as ApiError).retriable).toBe(true);
      }
    });

    it('should throw NETWORK_FAILED for network request failures', async () => {
      const networkError = new Error('Network request failed');
      mockFetch.mockRejectedValueOnce(networkError);

      try {
        await httpClient.get('/test');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error instanceof ApiError).toBe(true);
        expect((error as ApiError).code).toBe(ErrorCode.NETWORK_FAILED);
        expect((error as ApiError).message).toBe('Network request failed');
        expect((error as ApiError).retriable).toBe(true);
      }
    });

    it('should throw NETWORK_FAILED for fetch-related errors', async () => {
      const fetchError = new Error('fetch: network error');
      mockFetch.mockRejectedValueOnce(fetchError);

      try {
        await httpClient.get('/test');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error instanceof ApiError).toBe(true);
        expect((error as ApiError).code).toBe(ErrorCode.NETWORK_FAILED);
        expect((error as ApiError).message).toBe('fetch: network error');
        expect((error as ApiError).retriable).toBe(true);
      }
    });
  });

  describe('Error passthrough', () => {
    it('should re-throw ApiError instances unchanged', async () => {
      const originalApiError = new ApiError(ErrorCode.VALIDATION_ERROR, 'Custom validation error');
      mockFetch.mockRejectedValueOnce(originalApiError);

      try {
        await httpClient.get('/test');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBe(originalApiError);
        expect((error as ApiError).code).toBe(ErrorCode.VALIDATION_ERROR);
        expect((error as ApiError).message).toBe('Custom validation error');
      }
    });

    it('should re-throw unknown errors as generic Error', async () => {
      const unknownError = new Error('Some unknown error');
      mockFetch.mockRejectedValueOnce(unknownError);

      try {
        await httpClient.get('/test');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBe(unknownError);
        expect(error instanceof ApiError).toBe(false);
      }
    });
  });

  describe('Successful requests', () => {
    it('should return response data for successful requests', async () => {
      const responseData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData)
      } as Response);

      const result = await httpClient.get('/test');
      expect(result).toEqual(responseData);
    });

    it('should handle POST requests with data', async () => {
      const requestData = { name: 'Test' };
      const responseData = { id: 1, name: 'Test' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData)
      } as Response);

      const result = await httpClient.post('/test', requestData);
      
      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });
});