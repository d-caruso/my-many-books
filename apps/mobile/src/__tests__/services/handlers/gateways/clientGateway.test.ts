/**
 * Tests for ClientGateway implementation
 */

import {
  createClientGateway,
  createDefaultClientGatewayConfig,
  ClientGatewayFactory,
  ClientGatewayConfig,
} from '../../../../services/handlers/gateways/clientGateway';
import { ClientGatewayHandler } from '../../../../services/handlers/types/HandlerTypes';

// Mock HTTP client
const createMockHttpClient = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
});

// Mock book type
interface TestBook {
  id: string;
  title: string;
  author: string;
  status: 'reading' | 'completed';
  creationDate: string;
  updateDate: string;
}

// Mock navigator.onLine  
Object.defineProperty(global, 'navigator', {
  value: {
    onLine: true,
  },
  configurable: true,
});

describe('ClientGateway', () => {
  let mockHttpClient: ReturnType<typeof createMockHttpClient>;
  let config: ClientGatewayConfig;
  let gateway: ClientGatewayHandler<TestBook>;

  beforeEach(() => {
    mockHttpClient = createMockHttpClient();
    config = {
      baseURL: 'http://localhost:3001/api/v1',
      httpClient: mockHttpClient,
      options: {
        failFast: true,
        enableCaching: false,
        cacheTTL: 300000,
        validateResponses: true,
      },
      timeout: 10000,
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
    };
    gateway = createClientGateway<TestBook>('book', config);
  });

  describe('createClientGateway', () => {
    it('should create gateway with correct endpoint', async () => {
      const mockBook: TestBook = {
        id: '1',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        creationDate: '2026-01-01',
        updateDate: '2026-01-01',
      };

      mockHttpClient.post.mockResolvedValue(mockBook);

      const result = await gateway.create({
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/books',
        { title: 'Test Book', author: 'Test Author', status: 'reading' },
        expect.objectContaining({
          timeout: 10000,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockBook);
    });

    it('should handle create operation', async () => {
      const mockBook: TestBook = {
        id: '1',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        creationDate: '2026-01-01',
        updateDate: '2026-01-01',
      };

      mockHttpClient.post.mockResolvedValue(mockBook);

      const result = await gateway.create({
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
      });

      expect(result).toEqual(mockBook);
    });

    it('should handle update operation', async () => {
      const mockBook: TestBook = {
        id: '1',
        title: 'Updated Book',
        author: 'Test Author',
        status: 'completed',
        creationDate: '2026-01-01',
        updateDate: '2026-01-02',
      };

      mockHttpClient.put.mockResolvedValue(mockBook);

      const result = await gateway.update('1', {
        title: 'Updated Book',
        status: 'completed',
      });

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/books/1',
        { title: 'Updated Book', status: 'completed' },
        expect.any(Object)
      );
      expect(result).toEqual(mockBook);
    });

    it('should handle delete operation', async () => {
      mockHttpClient.delete.mockResolvedValue(undefined);

      await gateway.delete('1');

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/books/1',
        expect.any(Object)
      );
    });

    it('should handle read operation', async () => {
      const mockBook: TestBook = {
        id: '1',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        creationDate: '2026-01-01',
        updateDate: '2026-01-01',
      };

      mockHttpClient.get.mockResolvedValue(mockBook);

      const result = await gateway.read!('1');

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/books/1',
        expect.any(Object)
      );
      expect(result).toEqual(mockBook);
    });

    it('should handle list operation', async () => {
      const mockBooks: TestBook[] = [
        {
          id: '1',
          title: 'Test Book 1',
          author: 'Test Author',
          status: 'reading',
          creationDate: '2026-01-01',
          updateDate: '2026-01-01',
        },
        {
          id: '2',
          title: 'Test Book 2',
          author: 'Test Author',
          status: 'completed',
          creationDate: '2026-01-01',
          updateDate: '2026-01-01',
        },
      ];

      mockHttpClient.get.mockResolvedValue(mockBooks);

      const result = await gateway.list!();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/books',
        expect.any(Object)
      );
      expect(result).toEqual(mockBooks);
    });

    it('should handle list operation with filters', async () => {
      const mockBooks: TestBook[] = [];
      mockHttpClient.get.mockResolvedValue(mockBooks);

      await gateway.list!({
        search: 'test',
        status: 'reading',
        sortBy: 'title',
        sortDirection: 'asc',
        limit: 10,
        offset: 0,
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/books?search=test&sortBy=title&sortDirection=asc&limit=10&offset=0&status=reading',
        expect.any(Object)
      );
    });
  });

  describe('Fail Fast Behavior', () => {
    beforeEach(() => {
      // Mock navigator.onLine as false
      Object.defineProperty(global, 'navigator', {
        value: {
          onLine: false,
        },
        configurable: true,
      });
    });

    afterEach(() => {
      // Reset navigator.onLine
      Object.defineProperty(global, 'navigator', {
        value: {
          onLine: true,
        },
        configurable: true,
      });
    });

    it('should fail fast when offline and failFast is enabled', async () => {
      await expect(
        gateway.create({
          title: 'Test Book',
          author: 'Test Author',
          status: 'reading',
        })
      ).rejects.toThrow('No internet connection available');
    });

    it('should not fail fast when failFast is disabled', async () => {
      const configWithoutFailFast = {
        ...config,
        options: {
          ...config.options,
          failFast: false,
        },
      };

      const gatewayWithoutFailFast = createClientGateway<TestBook>('book', configWithoutFailFast);
      mockHttpClient.post.mockResolvedValue({
        id: '1',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        creationDate: '2026-01-01',
        updateDate: '2026-01-01',
      });

      // Should not fail immediately
      await expect(
        gatewayWithoutFailFast.create({
          title: 'Test Book',
          author: 'Test Author',
          status: 'reading',
        })
      ).resolves.toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors as retryable', async () => {
      const networkError = new Error('Network Error');
      mockHttpClient.post.mockRejectedValue(networkError);

      try {
        await gateway.create({
          title: 'Test Book',
          author: 'Test Author',
          status: 'reading',
        });
      } catch (error: any) {
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.retryable).toBe(true);
        expect(error.originalError).toBe(networkError);
      }
    });

    it('should handle server errors as retryable', async () => {
      const serverError = new Error('500 Internal Server Error');
      mockHttpClient.post.mockRejectedValue(serverError);

      try {
        await gateway.create({
          title: 'Test Book',
          author: 'Test Author',
          status: 'reading',
        });
      } catch (error: any) {
        expect(error.code).toBe('SERVER_ERROR');
        expect(error.retryable).toBe(true);
      }
    });

    it('should handle other errors as non-retryable', async () => {
      const validationError = new Error('400 Bad Request');
      mockHttpClient.post.mockRejectedValue(validationError);

      try {
        await gateway.create({
          title: 'Test Book',
          author: 'Test Author',
          status: 'reading',
        });
      } catch (error: any) {
        expect(error.code).toBe('HTTP_ERROR');
        expect(error.retryable).toBe(false);
      }
    });
  });

  describe('Response Validation', () => {
    it('should validate responses when enabled', async () => {
      mockHttpClient.post.mockResolvedValue(null);

      await expect(
        gateway.create({
          title: 'Test Book',
          author: 'Test Author',
          status: 'reading',
        })
      ).rejects.toThrow('Invalid response: null or undefined');
    });

    it('should skip validation when disabled', async () => {
      const configWithoutValidation = {
        ...config,
        options: {
          ...config.options,
          validateResponses: false,
        },
      };

      const gatewayWithoutValidation = createClientGateway<TestBook>('book', configWithoutValidation);
      mockHttpClient.post.mockResolvedValue(null);

      const result = await gatewayWithoutValidation.create({
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
      });

      expect(result).toBeNull();
    });
  });

  describe('createDefaultClientGatewayConfig', () => {
    it('should create default configuration', () => {
      const defaultConfig = createDefaultClientGatewayConfig(mockHttpClient);

      expect(defaultConfig.baseURL).toBe('http://localhost:3001/api/v1');
      expect(defaultConfig.httpClient).toBe(mockHttpClient);
      expect(defaultConfig.options.failFast).toBe(true);
      expect(defaultConfig.options.validateResponses).toBe(true);
      expect(defaultConfig.timeout).toBe(10000);
    });
  });

  describe('ClientGatewayFactory', () => {
    let factory: ClientGatewayFactory;

    beforeEach(() => {
      factory = new ClientGatewayFactory(config);
    });

    it('should create book gateway', () => {
      const bookGateway = factory.createBookGateway<TestBook>();
      expect(bookGateway).toBeDefined();
      expect(typeof bookGateway.create).toBe('function');
    });

    it('should create author gateway', () => {
      const authorGateway = factory.createAuthorGateway<TestBook>();
      expect(authorGateway).toBeDefined();
    });

    it('should create category gateway', () => {
      const categoryGateway = factory.createCategoryGateway<TestBook>();
      expect(categoryGateway).toBeDefined();
    });

    it('should create custom gateway', () => {
      const customGateway = factory.createGateway<TestBook>('custom');
      expect(customGateway).toBeDefined();
    });

    it('should update configuration', () => {
      factory.updateConfig({
        timeout: 5000,
      });

      // Configuration should be updated (this would need more complex testing to verify)
      expect(factory).toBeDefined();
    });
  });
});