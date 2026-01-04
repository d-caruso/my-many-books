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
} from '../types/HandlerTypes';
import { ClientGatewayOptions, DEFAULT_GATEWAY_CONFIG } from '../types/GatewayTypes';

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
   * Create request configuration with defaults (optimized)
   */
  // Cache the base config to avoid repeated object creation
  const baseRequestConfig: Record<string, unknown> = {
    timeout,
    headers: { ...defaultHeaders },
  };
  
  const createRequestConfig = (overrides?: Record<string, unknown>): Record<string, unknown> => {
    // If no overrides, return cached config
    if (!overrides) {
      return baseRequestConfig;
    }
    
    // Only create new object when needed
    return {
      ...baseRequestConfig,
      headers: { ...baseRequestConfig.headers, ...overrides.headers },
      ...overrides,
    };
  };


  /**
   * Simple cache for GET requests (if caching is enabled)
   */
  const responseCache = new Map<string, { data: unknown; timestamp: number }>();
  
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
   * Check cache for GET requests
   */
  const getCachedResponse = <R>(cacheKey: string): R | null => {
    if (!options.enableCaching) {
      return null;
    }
    
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < options.cacheTTL) {
      return cached.data as R;
    }
    
    // Clean up expired entry
    if (cached) {
      responseCache.delete(cacheKey);
    }
    
    return null;
  };
  
  /**
   * Cache response for GET requests
   */
  const setCachedResponse = (cacheKey: string, data: unknown): void => {
    if (options.enableCaching) {
      responseCache.set(cacheKey, { data, timestamp: Date.now() });
    }
  };


  // Return the handler implementation
  return {
    async create(data: CreatePayload<T>): Promise<T> {
      
      try {
        if (options.failFast && !navigator.onLine) {
          throw new Error('No internet connection available');
        }

        const config = createRequestConfig();
        const response = await httpClient.post<T>(resourceEndpoint, data, config);
        
        return validateResponse(response);
      } catch (error) {
        throw error;
      }
    },

    async update(id: string, data: UpdatePayload<T>): Promise<T> {
      
      try {
        if (options.failFast && !navigator.onLine) {
          throw new Error('No internet connection available');
        }

        const config = createRequestConfig();
        const response = await httpClient.put<T>(`${resourceEndpoint}/${id}`, data, config);
        
        return validateResponse(response);
      } catch (error) {
        throw error;
      }
    },

    async delete(id: string): Promise<void> {
      
      try {
        if (options.failFast && !navigator.onLine) {
          throw new Error('No internet connection available');
        }

        const config = createRequestConfig();
        await httpClient.delete<void>(`${resourceEndpoint}/${id}`, config);
      } catch (error) {
        throw error;
      }
    },

    async read(id: string): Promise<T> {
      
      try {
        if (options.failFast && !navigator.onLine) {
          throw new Error('No internet connection available');
        }

        // Check cache first for read operations
        const cacheKey = `read_${id}`;
        const cachedResponse = getCachedResponse<T>(cacheKey);
        if (cachedResponse) {
          return cachedResponse;
        }

        const config = createRequestConfig();
        const response = await httpClient.get<T>(`${resourceEndpoint}/${id}`, config);
        
        const validatedResponse = validateResponse(response);
        
        // Cache the response
        setCachedResponse(cacheKey, validatedResponse);
        
        return validatedResponse;
      } catch (error) {
        throw error;
      }
    },

    async list(filters?: FilterOptions<T>): Promise<T[]> {
      
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
        throw error;
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