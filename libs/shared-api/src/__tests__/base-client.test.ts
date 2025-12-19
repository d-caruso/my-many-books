import { BaseApiClient, ApiClientConfig } from '../base-client';
import { MockHttpClient } from '../__mocks__/MockHttpClient';

describe('BaseApiClient', () => {
  let mockHttpClient: MockHttpClient;
  let baseClient: BaseApiClient;
  let config: ApiClientConfig;

  beforeEach(() => {
    mockHttpClient = new MockHttpClient();
    config = {
      baseURL: 'https://api.example.com',
      timeout: 5000,
    };
  });

  afterEach(() => {
    mockHttpClient.reset();
  });

  describe('Constructor and Configuration', () => {
    it('should create instance with valid config', () => {
      baseClient = new BaseApiClient(mockHttpClient, config);
      expect(baseClient).toBeInstanceOf(BaseApiClient);
    });

    it('should use provided baseURL', async () => {
      baseClient = new BaseApiClient(mockHttpClient, config);
      mockHttpClient.setResponse('/test', { data: { success: true }, status: 200 });

      await (baseClient as any).get('/test');

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.url).toBe('https://api.example.com/test');
    });

    it('should allow changing baseURL via setBaseURL', async () => {
      baseClient = new BaseApiClient(mockHttpClient, config);
      baseClient.setBaseURL('https://api.newdomain.com');
      mockHttpClient.setResponse('/test', { data: { success: true }, status: 200 });

      await (baseClient as any).get('/test');

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.url).toBe('https://api.newdomain.com/test');
    });

    it('should use default timeout of 10000ms when not specified', async () => {
      const configWithoutTimeout = { baseURL: 'https://api.example.com' };
      baseClient = new BaseApiClient(mockHttpClient, configWithoutTimeout);
      mockHttpClient.setResponse('/test', { data: { success: true }, status: 200 });

      await (baseClient as any).get('/test');

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.timeout).toBe(10000);
    });

    it('should use custom timeout when specified', async () => {
      baseClient = new BaseApiClient(mockHttpClient, config);
      mockHttpClient.setResponse('/test', { data: { success: true }, status: 200 });

      await (baseClient as any).get('/test');

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.timeout).toBe(5000);
    });
  });

  describe('Authentication Token Injection', () => {
    it('should not add Authorization header when getAuthToken is not provided', async () => {
      baseClient = new BaseApiClient(mockHttpClient, config);
      mockHttpClient.setResponse('/test', { data: { success: true }, status: 200 });

      await (baseClient as any).get('/test');

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.headers?.['Authorization']).toBeUndefined();
    });

    it('should not add Authorization header when getAuthToken returns null', async () => {
      const configWithAuth = {
        ...config,
        getAuthToken: jest.fn(() => null),
      };
      baseClient = new BaseApiClient(mockHttpClient, configWithAuth);
      mockHttpClient.setResponse('/test', { data: { success: true }, status: 200 });

      await (baseClient as any).get('/test');

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.headers?.['Authorization']).toBeUndefined();
      expect(configWithAuth.getAuthToken).toHaveBeenCalled();
    });

    it('should add Authorization header with Bearer token when getAuthToken returns a token', async () => {
      const mockToken = 'test-token-123';
      const configWithAuth = {
        ...config,
        getAuthToken: jest.fn(() => mockToken),
      };
      baseClient = new BaseApiClient(mockHttpClient, configWithAuth);
      mockHttpClient.setResponse('/test', { data: { success: true }, status: 200 });

      await (baseClient as any).get('/test');

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.headers?.['Authorization']).toBe(`Bearer ${mockToken}`);
      expect(configWithAuth.getAuthToken).toHaveBeenCalled();
    });

    it('should call getAuthToken for every request', async () => {
      const configWithAuth = {
        ...config,
        getAuthToken: jest.fn(() => 'token'),
      };
      baseClient = new BaseApiClient(mockHttpClient, configWithAuth);
      mockHttpClient.setDefaultResponse({ data: { success: true }, status: 200 });

      await (baseClient as any).get('/test1');
      await (baseClient as any).post('/test2', {});
      await (baseClient as any).put('/test3', {});

      expect(configWithAuth.getAuthToken).toHaveBeenCalledTimes(3);
    });
  });

  describe('Default Headers', () => {
    beforeEach(() => {
      baseClient = new BaseApiClient(mockHttpClient, config);
      mockHttpClient.setDefaultResponse({ data: { success: true }, status: 200 });
    });

    it('should include Content-Type: application/json by default', async () => {
      await (baseClient as any).get('/test');

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.headers?.['Content-Type']).toBe('application/json');
    });

    it('should allow overriding default headers', async () => {
      await (baseClient as any).get('/test', {
        headers: { 'Content-Type': 'application/xml' },
      });

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.headers?.['Content-Type']).toBe('application/xml');
    });

    it('should merge custom headers with default headers', async () => {
      await (baseClient as any).get('/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
          'X-Another-Header': 'another-value',
        },
      });

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.headers?.['Content-Type']).toBe('application/json');
      expect(lastRequest?.config?.headers?.['X-Custom-Header']).toBe('custom-value');
      expect(lastRequest?.config?.headers?.['X-Another-Header']).toBe('another-value');
    });
  });

  describe('HTTP Method Delegation', () => {
    beforeEach(() => {
      baseClient = new BaseApiClient(mockHttpClient, config);
      mockHttpClient.setDefaultResponse({ data: { result: 'success' }, status: 200 });
    });

    it('should delegate GET requests correctly', async () => {
      const result = await (baseClient as any).get('/users');

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toBe('https://api.example.com/users');
      expect(result).toEqual({ result: 'success' });
    });

    it('should delegate POST requests with data correctly', async () => {
      const postData = { name: 'John', email: 'john@example.com' };
      const result = await (baseClient as any).post('/users', postData);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('POST');
      expect(lastRequest?.url).toBe('https://api.example.com/users');
      expect(lastRequest?.data).toEqual(postData);
      expect(result).toEqual({ result: 'success' });
    });

    it('should delegate PUT requests with data correctly', async () => {
      const putData = { name: 'John Updated' };
      const result = await (baseClient as any).put('/users/1', putData);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('PUT');
      expect(lastRequest?.url).toBe('https://api.example.com/users/1');
      expect(lastRequest?.data).toEqual(putData);
      expect(result).toEqual({ result: 'success' });
    });

    it('should delegate PATCH requests with data correctly', async () => {
      const patchData = { email: 'newemail@example.com' };
      const result = await (baseClient as any).patch('/users/1', patchData);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('PATCH');
      expect(lastRequest?.url).toBe('https://api.example.com/users/1');
      expect(lastRequest?.data).toEqual(patchData);
      expect(result).toEqual({ result: 'success' });
    });

    it('should delegate DELETE requests correctly', async () => {
      const result = await (baseClient as any).delete('/users/1');

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('DELETE');
      expect(lastRequest?.url).toBe('https://api.example.com/users/1');
      expect(result).toEqual({ result: 'success' });
    });

    it('should pass request config to all HTTP methods', async () => {
      const requestConfig = {
        headers: { 'X-Custom': 'value' },
        params: { page: 1, limit: 10 },
      };

      await (baseClient as any).get('/users', requestConfig);
      const getRequest = mockHttpClient.getLastRequest();
      expect(getRequest?.config?.headers?.['X-Custom']).toBe('value');
      expect(getRequest?.config?.params).toEqual({ page: 1, limit: 10 });

      await (baseClient as any).post('/users', { name: 'Test' }, requestConfig);
      const postRequest = mockHttpClient.getLastRequest();
      expect(postRequest?.config?.headers?.['X-Custom']).toBe('value');
    });
  });

  describe('401 Error Handling', () => {
    it('should call onUnauthorized callback when 401 error occurs', async () => {
      const onUnauthorized = jest.fn();
      const configWithCallback = {
        ...config,
        onUnauthorized,
      };
      baseClient = new BaseApiClient(mockHttpClient, configWithCallback);
      mockHttpClient.setResponse('/test', { data: {}, status: 401 });

      await expect((baseClient as any).get('/test')).rejects.toThrow();
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('should not call onUnauthorized when callback is not provided', async () => {
      baseClient = new BaseApiClient(mockHttpClient, config);
      mockHttpClient.setResponse('/test', { data: {}, status: 401 });

      await expect((baseClient as any).get('/test')).rejects.toThrow('HTTP Error 401');
    });

    it('should not call onUnauthorized for non-401 errors', async () => {
      const onUnauthorized = jest.fn();
      const configWithCallback = {
        ...config,
        onUnauthorized,
      };
      baseClient = new BaseApiClient(mockHttpClient, configWithCallback);
      mockHttpClient.setResponse('/test', { data: {}, status: 500 });

      await expect((baseClient as any).get('/test')).rejects.toThrow();
      expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it('should call onUnauthorized only once for a single 401 error', async () => {
      const onUnauthorized = jest.fn();
      const configWithCallback = {
        ...config,
        onUnauthorized,
      };
      baseClient = new BaseApiClient(mockHttpClient, configWithCallback);
      mockHttpClient.setResponse('/test', { data: {}, status: 401 });

      await expect((baseClient as any).get('/test')).rejects.toThrow();
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('should still throw error after calling onUnauthorized', async () => {
      const onUnauthorized = jest.fn();
      const configWithCallback = {
        ...config,
        onUnauthorized,
      };
      baseClient = new BaseApiClient(mockHttpClient, configWithCallback);
      mockHttpClient.setResponse('/test', { data: {}, status: 401 });

      await expect((baseClient as any).get('/test')).rejects.toThrow('HTTP Error 401');
      expect(onUnauthorized).toHaveBeenCalled();
    });
  });

  describe('Error Propagation', () => {
    beforeEach(() => {
      baseClient = new BaseApiClient(mockHttpClient, config);
    });

    it('should propagate 400 errors', async () => {
      mockHttpClient.setResponse('/test', { data: { error: 'Bad Request' }, status: 400 });
      await expect((baseClient as any).get('/test')).rejects.toThrow('HTTP Error 400');
    });

    it('should propagate 404 errors', async () => {
      mockHttpClient.setResponse('/test', { data: { error: 'Not Found' }, status: 404 });
      await expect((baseClient as any).get('/test')).rejects.toThrow('HTTP Error 404');
    });

    it('should propagate 500 errors', async () => {
      mockHttpClient.setResponse('/test', { data: { error: 'Server Error' }, status: 500 });
      await expect((baseClient as any).get('/test')).rejects.toThrow('HTTP Error 500');
    });

    it('should propagate network errors', async () => {
      const networkError = new Error('Network error');
      mockHttpClient.get = jest.fn().mockRejectedValue(networkError);

      await expect((baseClient as any).get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('Request Config Merging', () => {
    beforeEach(() => {
      baseClient = new BaseApiClient(mockHttpClient, config);
      mockHttpClient.setDefaultResponse({ data: { success: true }, status: 200 });
    });

    it('should merge global timeout with request-specific config', async () => {
      await (baseClient as any).get('/test', { timeout: 3000 });

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.timeout).toBe(3000);
    });

    it('should merge params from request config', async () => {
      await (baseClient as any).get('/test', {
        params: { page: 2, limit: 20 },
      });

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.params).toEqual({ page: 2, limit: 20 });
    });

    it('should preserve custom headers when merging config', async () => {
      const customHeaders = {
        'X-API-Key': 'secret',
        'X-Request-ID': '12345',
      };

      await (baseClient as any).get('/test', { headers: customHeaders });

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.headers?.['X-API-Key']).toBe('secret');
      expect(lastRequest?.config?.headers?.['X-Request-ID']).toBe('12345');
      expect(lastRequest?.config?.headers?.['Content-Type']).toBe('application/json');
    });
  });
});
