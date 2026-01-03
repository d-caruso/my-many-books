/**
 * Client Gateway - Pure HTTP calls (web-app pattern)
 * 
 * Fails immediately when offline (no queue)
 * Same pattern as web-app handlers
 */

import {
  ClientGatewayHandler,
  CreatePayload,
  UpdatePayload,
  FilterOptions,
  HandlerError,
  HandlerContext,
} from '../types/HandlerTypes';
import { ClientGatewayOptions, DEFAULT_GATEWAY_CONFIG } from '../types/GatewayTypes';
import { OperationType } from '../../../types/queue';

/**
 * HTTP Client interface for making requests
 * Uses existing apiClient from mobile app
 */
interface HttpClient {
  get<T>(url: string, config?: Record<string, unknown>): Promise<T>;
  post<T>(url: string, data?: unknown, config?: Record<string, unknown>): Promise<T>;
  put<T>(url: string, data?: unknown, config?: Record<string, unknown>): Promise<T>;
  delete<T>(url: string, config?: Record<string, unknown>): Promise<T>;
}

/**
 * Client Gateway Configuration
 */
export interface ClientGatewayConfig {
  /** Base API URL */
  baseURL: string;
  /** HTTP client instance */
  httpClient: HttpClient;
  /** Gateway options */
  options: ClientGatewayOptions;
  /** Default request timeout */
  timeout: number;
  /** Default headers */
  defaultHeaders: Record<string, string>;
}

/**
 * Create a Client Gateway handler for a specific resource
 * 
 * @param resourceType - Resource type (book, author, category)
 * @param config - Gateway configuration
 * @returns ClientGateway handler instance
 */
export function createClientGateway<T>(
  resourceType: string,
  config: ClientGatewayConfig
): ClientGatewayHandler<T> {
  const { baseURL, httpClient, options, timeout, defaultHeaders } = config;
  const resourceEndpoint = `${baseURL}/${resourceType}s`;

  /**
   * Create request configuration with defaults
   */
  const createRequestConfig = (overrides?: Record<string, unknown>): Record<string, unknown> => ({
    timeout,
    headers: { ...defaultHeaders, ...overrides?.headers },
    ...overrides,
  });

  /**
   * Handle HTTP errors and convert to HandlerError
   */
  const handleError = (error: Error, context: HandlerContext): HandlerError => {
    const handlerError: HandlerError = {
      name: 'ClientGatewayError',
      message: error.message,
      code: 'HTTP_ERROR',
      context,
      originalError: error,
      retryable: false,
    };

    // Determine if error is retryable based on type
    if (error.message.includes('Network Error') || error.message.includes('timeout')) {
      handlerError.code = 'NETWORK_ERROR';
      handlerError.retryable = true;
    } else if (error.message.includes('500') || error.message.includes('502')) {
      handlerError.code = 'SERVER_ERROR';
      handlerError.retryable = true;
    }

    return handlerError;
  };

  /**
   * Validate response against schema if enabled
   */
  const validateResponse = <R>(data: R): R => {
    if (options.validateResponses) {
      // Basic validation - can be extended with schema validation
      if (data === null || data === undefined) {
        throw new Error('Invalid response: null or undefined');
      }
    }
    return data;
  };

  /**
   * Create operation context for error handling
   */
  const createContext = (operationType: OperationType, resourceId?: string): HandlerContext => ({
    operationId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    operationType,
    resourceType,
    isOnline: true, // Client gateway assumes online
    timestamp: new Date(),
  });

  // Return the handler implementation
  return {
    async create(data: CreatePayload<T>): Promise<T> {
      const context = createContext('CREATE');
      
      try {
        if (options.failFast && !navigator.onLine) {
          throw new Error('No internet connection available');
        }

        const config = createRequestConfig();
        const response = await httpClient.post<T>(resourceEndpoint, data, config);
        
        return validateResponse(response);
      } catch (error) {
        throw handleError(error as Error, context);
      }
    },

    async update(id: string, data: UpdatePayload<T>): Promise<T> {
      const context = createContext('UPDATE', id);
      
      try {
        if (options.failFast && !navigator.onLine) {
          throw new Error('No internet connection available');
        }

        const config = createRequestConfig();
        const response = await httpClient.put<T>(`${resourceEndpoint}/${id}`, data, config);
        
        return validateResponse(response);
      } catch (error) {
        throw handleError(error as Error, context);
      }
    },

    async delete(id: string): Promise<void> {
      const context = createContext('DELETE', id);
      
      try {
        if (options.failFast && !navigator.onLine) {
          throw new Error('No internet connection available');
        }

        const config = createRequestConfig();
        await httpClient.delete<void>(`${resourceEndpoint}/${id}`, config);
      } catch (error) {
        throw handleError(error as Error, context);
      }
    },

    async read(id: string): Promise<T> {
      const context = createContext('READ', id);
      
      try {
        if (options.failFast && !navigator.onLine) {
          throw new Error('No internet connection available');
        }

        const config = createRequestConfig();
        const response = await httpClient.get<T>(`${resourceEndpoint}/${id}`, config);
        
        return validateResponse(response);
      } catch (error) {
        throw handleError(error as Error, context);
      }
    },

    async list(filters?: FilterOptions<T>): Promise<T[]> {
      const context = createContext('LIST');
      
      try {
        if (options.failFast && !navigator.onLine) {
          throw new Error('No internet connection available');
        }

        // Convert filters to query parameters
        const queryParams = filters ? new URLSearchParams() : null;
        if (filters && queryParams) {
          if (filters.search) queryParams.append('search', filters.search);
          if (filters.sortBy) queryParams.append('sortBy', String(filters.sortBy));
          if (filters.sortDirection) queryParams.append('sortDirection', filters.sortDirection);
          if (filters.limit) queryParams.append('limit', String(filters.limit));
          if (filters.offset !== undefined) queryParams.append('offset', String(filters.offset));
          
          // Add other filter properties
          Object.entries(filters).forEach(([key, value]) => {
            if (!['search', 'sortBy', 'sortDirection', 'limit', 'offset'].includes(key) && 
                value !== undefined && value !== null) {
              queryParams!.append(key, String(value));
            }
          });
        }

        const url = queryParams ? `${resourceEndpoint}?${queryParams.toString()}` : resourceEndpoint;
        const config = createRequestConfig();
        const response = await httpClient.get<T[]>(url, config);
        
        return validateResponse(response);
      } catch (error) {
        throw handleError(error as Error, context);
      }
    },
  };
}

/**
 * Default Client Gateway configuration
 */
export const createDefaultClientGatewayConfig = (httpClient: HttpClient): ClientGatewayConfig => ({
  baseURL: DEFAULT_GATEWAY_CONFIG.baseURL,
  httpClient,
  options: {
    failFast: true,
    enableCaching: false,
    cacheTTL: 300000, // 5 minutes
    validateResponses: true,
  },
  timeout: DEFAULT_GATEWAY_CONFIG.timeout,
  defaultHeaders: DEFAULT_GATEWAY_CONFIG.defaultHeaders,
});

/**
 * Client Gateway factory for common resource types
 */
export class ClientGatewayFactory {
  private config: ClientGatewayConfig;

  constructor(config: ClientGatewayConfig) {
    this.config = config;
  }

  /**
   * Create a Book client gateway
   */
  createBookGateway<T>(): ClientGatewayHandler<T> {
    return createClientGateway<T>('book', this.config);
  }

  /**
   * Create an Author client gateway
   */
  createAuthorGateway<T>(): ClientGatewayHandler<T> {
    return createClientGateway<T>('author', this.config);
  }

  /**
   * Create a Category client gateway
   */
  createCategoryGateway<T>(): ClientGatewayHandler<T> {
    return createClientGateway<T>('category', this.config);
  }

  /**
   * Create a gateway for any resource type
   */
  createGateway<T>(resourceType: string): ClientGatewayHandler<T> {
    return createClientGateway<T>(resourceType, this.config);
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ClientGatewayConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}