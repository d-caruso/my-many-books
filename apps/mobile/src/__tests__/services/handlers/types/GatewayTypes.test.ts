/**
 * Tests for Gateway Configuration Types
 * 
 * Validates configuration types and default values for gateway behavior
 */

import {
  GatewayConfig,
  NetworkConfig,
  QueueConfig,
  StrategyConfig,
  ClientGatewayOptions,
  MobileHandlerOptions,
  QueueHandlerOptions,
  RequestConfig,
  ResponseConfig,
  RetryConfig,
  RetryCondition,
  AuthConfig,
  LoggingConfig,
  PerformanceConfig,
  PerformanceMetric,
  PerformanceData,
  CompleteGatewayConfig,
  EnvironmentConfig,
  DEFAULT_GATEWAY_CONFIG,
} from '../../../../services/handlers/types/GatewayTypes';

describe('GatewayTypes', () => {
  describe('Configuration Interfaces', () => {
    it('should define GatewayConfig interface correctly', () => {
      const config: GatewayConfig = {
        baseURL: 'https://api.example.com',
        timeout: 10000,
        retryAttempts: 3,
        retryDelay: 1000,
        enableLogging: true,
        defaultHeaders: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token',
        },
        networkConfig: {
          reachabilityTimeout: 5000,
          connectivityCheckURL: 'https://google.com',
          pollInterval: 30000,
          autoRetryOnRecovery: true,
          onlineConnectionTypes: ['wifi', 'cellular'],
        },
        queueConfig: {
          maxQueueSize: 1000,
          persistenceStrategy: 'sqlite',
          autoSyncInterval: 60000,
          enableCompression: false,
          maxOperationAge: 604800000, // 7 days
          syncBatchSize: 10,
        },
      };

      expect(config.baseURL).toBe('https://api.example.com');
      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(3);
      expect(config.defaultHeaders['Content-Type']).toBe('application/json');
      expect(config.networkConfig.reachabilityTimeout).toBe(5000);
      expect(config.queueConfig.maxQueueSize).toBe(1000);
    });

    it('should define NetworkConfig interface correctly', () => {
      const networkConfig: NetworkConfig = {
        reachabilityTimeout: 5000,
        connectivityCheckURL: 'https://google.com',
        pollInterval: 30000,
        autoRetryOnRecovery: true,
        onlineConnectionTypes: ['wifi', 'cellular', 'ethernet'],
      };

      expect(networkConfig.reachabilityTimeout).toBe(5000);
      expect(networkConfig.connectivityCheckURL).toBe('https://google.com');
      expect(networkConfig.pollInterval).toBe(30000);
      expect(networkConfig.autoRetryOnRecovery).toBe(true);
      expect(networkConfig.onlineConnectionTypes).toContain('wifi');
      expect(networkConfig.onlineConnectionTypes).toContain('cellular');
    });

    it('should define QueueConfig interface correctly', () => {
      const queueConfig: QueueConfig = {
        maxQueueSize: 500,
        persistenceStrategy: 'asyncstorage',
        autoSyncInterval: 30000,
        enableCompression: true,
        maxOperationAge: 86400000, // 1 day
        syncBatchSize: 5,
      };

      expect(queueConfig.maxQueueSize).toBe(500);
      expect(queueConfig.persistenceStrategy).toBe('asyncstorage');
      expect(queueConfig.autoSyncInterval).toBe(30000);
      expect(queueConfig.enableCompression).toBe(true);
      expect(queueConfig.syncBatchSize).toBe(5);
    });
  });

  describe('Strategy-Specific Options', () => {
    it('should define ClientGatewayOptions correctly', () => {
      const options: ClientGatewayOptions = {
        failFast: true,
        enableCaching: true,
        cacheTTL: 300000, // 5 minutes
        validateResponses: true,
      };

      expect(options.failFast).toBe(true);
      expect(options.enableCaching).toBe(true);
      expect(options.cacheTTL).toBe(300000);
      expect(options.validateResponses).toBe(true);
    });

    it('should define MobileHandlerOptions correctly', () => {
      const options: MobileHandlerOptions = {
        optimisticUpdates: true,
        offlineCacheFallback: true,
        retryOnRecovery: true,
        queueTimeout: 5000,
        notifyOnQueue: true,
      };

      expect(options.optimisticUpdates).toBe(true);
      expect(options.offlineCacheFallback).toBe(true);
      expect(options.retryOnRecovery).toBe(true);
      expect(options.queueTimeout).toBe(5000);
      expect(options.notifyOnQueue).toBe(true);
    });

    it('should define QueueHandlerOptions correctly', () => {
      const options: QueueHandlerOptions = {
        generateOptimisticIds: true,
        idGenerationStrategy: 'uuid',
        validateBeforeQueue: true,
        deduplicateOperations: true,
        conflictResolution: 'last-write-wins',
      };

      expect(options.generateOptimisticIds).toBe(true);
      expect(options.idGenerationStrategy).toBe('uuid');
      expect(options.validateBeforeQueue).toBe(true);
      expect(options.deduplicateOperations).toBe(true);
      expect(options.conflictResolution).toBe('last-write-wins');
    });

    it('should define StrategyConfig correctly', () => {
      const clientConfig: StrategyConfig = {
        strategy: 'client-gateway',
        options: {
          failFast: true,
          enableCaching: false,
          cacheTTL: 0,
          validateResponses: false,
        } as ClientGatewayOptions,
      };

      const mobileConfig: StrategyConfig = {
        strategy: 'mobile-handler',
        options: {
          optimisticUpdates: true,
          offlineCacheFallback: true,
          retryOnRecovery: true,
          queueTimeout: 10000,
          notifyOnQueue: false,
        } as MobileHandlerOptions,
      };

      const queueConfig: StrategyConfig = {
        strategy: 'queue-handler',
        options: {
          generateOptimisticIds: true,
          idGenerationStrategy: 'timestamp',
          validateBeforeQueue: false,
          deduplicateOperations: false,
          conflictResolution: 'manual',
        } as QueueHandlerOptions,
      };

      expect(clientConfig.strategy).toBe('client-gateway');
      expect(mobileConfig.strategy).toBe('mobile-handler');
      expect(queueConfig.strategy).toBe('queue-handler');
    });
  });

  describe('Request and Response Configuration', () => {
    it('should define RequestConfig correctly', () => {
      const requestConfig: RequestConfig = {
        timeout: 15000,
        retryAttempts: 5,
        headers: {
          'X-Custom-Header': 'value',
        },
        priority: 'high',
        cache: 'network-first',
        forceStrategy: 'mobile-handler',
      };

      expect(requestConfig.timeout).toBe(15000);
      expect(requestConfig.retryAttempts).toBe(5);
      expect(requestConfig.headers?.['X-Custom-Header']).toBe('value');
      expect(requestConfig.priority).toBe('high');
      expect(requestConfig.cache).toBe('network-first');
      expect(requestConfig.forceStrategy).toBe('mobile-handler');
    });

    it('should define ResponseConfig correctly', () => {
      const responseConfig: ResponseConfig = {
        format: 'json',
        schema: { type: 'object' },
        transform: (data) => ({ ...data, transformed: true }),
        errorHandler: (error) => new Error(`Custom: ${error.message}`),
      };

      expect(responseConfig.format).toBe('json');
      expect(responseConfig.schema).toEqual({ type: 'object' });
      expect(typeof responseConfig.transform).toBe('function');
      expect(typeof responseConfig.errorHandler).toBe('function');
    });

    it('should define RetryConfig correctly', () => {
      const retryConfig: RetryConfig = {
        maxAttempts: 5,
        baseDelay: 1000,
        backoffStrategy: 'exponential',
        maxDelay: 30000,
        jitter: 0.1,
        retryConditions: [
          {
            statusCodes: [408, 429, 500, 502, 503, 504],
            networkErrors: true,
          },
          {
            errorTypes: ['TIMEOUT_ERROR', 'CONNECTION_ERROR'],
            predicate: (error) => error.message.includes('retryable'),
          },
        ],
      };

      expect(retryConfig.maxAttempts).toBe(5);
      expect(retryConfig.backoffStrategy).toBe('exponential');
      expect(retryConfig.retryConditions).toHaveLength(2);
      expect(retryConfig.retryConditions[0].statusCodes).toContain(500);
      expect(retryConfig.retryConditions[0].networkErrors).toBe(true);
      expect(retryConfig.retryConditions[1].errorTypes).toContain('TIMEOUT_ERROR');
    });

    it('should define RetryCondition correctly', () => {
      const condition: RetryCondition = {
        statusCodes: [500, 502, 503],
        errorTypes: ['NetworkError'],
        networkErrors: true,
        predicate: (error: Error) => error.name === 'RetryableError',
      };

      expect(condition.statusCodes).toEqual([500, 502, 503]);
      expect(condition.errorTypes).toEqual(['NetworkError']);
      expect(condition.networkErrors).toBe(true);
      expect(typeof condition.predicate).toBe('function');
    });
  });

  describe('Authentication and Logging', () => {
    it('should define AuthConfig correctly', () => {
      const authConfig: AuthConfig = {
        type: 'bearer',
        tokenProvider: async () => 'mock-token',
        headerName: 'Authorization',
        refresh: {
          threshold: 300, // 5 minutes
          endpoint: '/auth/refresh',
          autoRefresh: true,
        },
      };

      expect(authConfig.type).toBe('bearer');
      expect(typeof authConfig.tokenProvider).toBe('function');
      expect(authConfig.headerName).toBe('Authorization');
      expect(authConfig.refresh?.threshold).toBe(300);
      expect(authConfig.refresh?.autoRefresh).toBe(true);
    });

    it('should define LoggingConfig correctly', () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const loggingConfig: LoggingConfig = {
        level: 'debug',
        logRequests: true,
        logResponses: true,
        logQueueOps: true,
        logNetworkState: true,
        logger: mockLogger,
      };

      expect(loggingConfig.level).toBe('debug');
      expect(loggingConfig.logRequests).toBe(true);
      expect(loggingConfig.logResponses).toBe(true);
      expect(loggingConfig.logQueueOps).toBe(true);
      expect(loggingConfig.logNetworkState).toBe(true);
      expect(loggingConfig.logger).toBe(mockLogger);
    });
  });

  describe('Performance Monitoring', () => {
    it('should define PerformanceConfig correctly', () => {
      const performanceConfig: PerformanceConfig = {
        enabled: true,
        sampleRate: 0.1,
        metrics: ['request-duration', 'queue-size', 'error-rate'],
        onMetrics: jest.fn(),
      };

      expect(performanceConfig.enabled).toBe(true);
      expect(performanceConfig.sampleRate).toBe(0.1);
      expect(performanceConfig.metrics).toContain('request-duration');
      expect(typeof performanceConfig.onMetrics).toBe('function');
    });

    it('should define PerformanceData correctly', () => {
      const performanceData: PerformanceData = {
        metric: 'request-duration',
        value: 1234.5,
        timestamp: new Date(),
        context: {
          endpoint: '/api/books',
          method: 'POST',
          status: 200,
        },
      };

      expect(performanceData.metric).toBe('request-duration');
      expect(performanceData.value).toBe(1234.5);
      expect(performanceData.timestamp).toBeInstanceOf(Date);
      expect(performanceData.context?.endpoint).toBe('/api/books');
    });

    it('should define all PerformanceMetric types', () => {
      const metrics: PerformanceMetric[] = [
        'request-duration',
        'queue-size',
        'sync-duration',
        'cache-hit-rate',
        'network-latency',
        'error-rate',
      ];

      expect(metrics).toHaveLength(6);
      metrics.forEach(metric => {
        expect(typeof metric).toBe('string');
      });
    });
  });

  describe('Complete Configuration', () => {
    it('should define CompleteGatewayConfig correctly', () => {
      const completeConfig: CompleteGatewayConfig = {
        ...DEFAULT_GATEWAY_CONFIG,
        auth: {
          type: 'bearer',
          tokenProvider: async () => 'token',
        },
        logging: {
          level: 'info',
          logRequests: true,
          logResponses: false,
          logQueueOps: true,
          logNetworkState: false,
        },
        performance: {
          enabled: true,
          sampleRate: 0.05,
          metrics: ['request-duration', 'error-rate'],
        },
        strategies: {
          'client-gateway': {
            strategy: 'client-gateway',
            options: {
              failFast: true,
              enableCaching: false,
              cacheTTL: 0,
              validateResponses: true,
            },
          },
          'mobile-handler': {
            strategy: 'mobile-handler',
            options: {
              optimisticUpdates: true,
              offlineCacheFallback: true,
              retryOnRecovery: true,
              queueTimeout: 5000,
              notifyOnQueue: false,
            },
          },
          'queue-handler': {
            strategy: 'queue-handler',
            options: {
              generateOptimisticIds: true,
              idGenerationStrategy: 'uuid',
              validateBeforeQueue: false,
              deduplicateOperations: true,
              conflictResolution: 'last-write-wins',
            },
          },
        },
      };

      expect(completeConfig.auth?.type).toBe('bearer');
      expect(completeConfig.logging?.level).toBe('info');
      expect(completeConfig.performance?.enabled).toBe(true);
      expect(completeConfig.strategies['client-gateway'].strategy).toBe('client-gateway');
      expect(completeConfig.strategies['mobile-handler'].strategy).toBe('mobile-handler');
      expect(completeConfig.strategies['queue-handler'].strategy).toBe('queue-handler');
    });

    it('should define EnvironmentConfig correctly', () => {
      const envConfig: EnvironmentConfig = {
        environment: 'staging',
        apiBaseURL: 'https://staging-api.example.com',
        debugMode: true,
        overrides: {
          timeout: 20000,
          retryAttempts: 5,
          enableLogging: true,
        },
      };

      expect(envConfig.environment).toBe('staging');
      expect(envConfig.apiBaseURL).toBe('https://staging-api.example.com');
      expect(envConfig.debugMode).toBe(true);
      expect(envConfig.overrides.timeout).toBe(20000);
    });
  });

  describe('Default Configuration', () => {
    it('should provide valid DEFAULT_GATEWAY_CONFIG', () => {
      expect(DEFAULT_GATEWAY_CONFIG).toBeDefined();
      expect(DEFAULT_GATEWAY_CONFIG.baseURL).toBe('http://localhost:3001/api/v1');
      expect(DEFAULT_GATEWAY_CONFIG.timeout).toBe(10000);
      expect(DEFAULT_GATEWAY_CONFIG.retryAttempts).toBe(3);
      expect(DEFAULT_GATEWAY_CONFIG.retryDelay).toBe(1000);
      expect(DEFAULT_GATEWAY_CONFIG.defaultHeaders['Content-Type']).toBe('application/json');
      expect(DEFAULT_GATEWAY_CONFIG.defaultHeaders['Accept']).toBe('application/json');
    });

    it('should have valid networkConfig defaults', () => {
      const networkConfig = DEFAULT_GATEWAY_CONFIG.networkConfig;
      
      expect(networkConfig.reachabilityTimeout).toBe(5000);
      expect(networkConfig.connectivityCheckURL).toBe('https://www.google.com');
      expect(networkConfig.pollInterval).toBe(30000);
      expect(networkConfig.autoRetryOnRecovery).toBe(true);
      expect(networkConfig.onlineConnectionTypes).toContain('wifi');
      expect(networkConfig.onlineConnectionTypes).toContain('cellular');
    });

    it('should have valid queueConfig defaults', () => {
      const queueConfig = DEFAULT_GATEWAY_CONFIG.queueConfig;
      
      expect(queueConfig.maxQueueSize).toBe(1000);
      expect(queueConfig.persistenceStrategy).toBe('sqlite');
      expect(queueConfig.autoSyncInterval).toBe(60000);
      expect(queueConfig.enableCompression).toBe(false);
      expect(queueConfig.maxOperationAge).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
      expect(queueConfig.syncBatchSize).toBe(10);
    });
  });

  describe('Type Constraints', () => {
    it('should enforce correct persistence strategy values', () => {
      const validStrategies = ['memory', 'sqlite', 'asyncstorage'] as const;
      
      validStrategies.forEach(strategy => {
        const queueConfig: QueueConfig = {
          maxQueueSize: 100,
          persistenceStrategy: strategy,
          autoSyncInterval: 60000,
          enableCompression: false,
          maxOperationAge: 86400000,
          syncBatchSize: 10,
        };
        
        expect(queueConfig.persistenceStrategy).toBe(strategy);
      });
    });

    it('should enforce correct ID generation strategies', () => {
      const validStrategies = ['uuid', 'timestamp', 'sequential'] as const;
      
      validStrategies.forEach(strategy => {
        const options: QueueHandlerOptions = {
          generateOptimisticIds: true,
          idGenerationStrategy: strategy,
          validateBeforeQueue: false,
          deduplicateOperations: false,
          conflictResolution: 'last-write-wins',
        };
        
        expect(options.idGenerationStrategy).toBe(strategy);
      });
    });

    it('should enforce correct environment types', () => {
      const validEnvironments = ['development', 'staging', 'production'] as const;
      
      validEnvironments.forEach(env => {
        const envConfig: EnvironmentConfig = {
          environment: env,
          apiBaseURL: `https://${env}-api.example.com`,
          debugMode: env !== 'production',
          overrides: {},
        };
        
        expect(envConfig.environment).toBe(env);
      });
    });
  });
});