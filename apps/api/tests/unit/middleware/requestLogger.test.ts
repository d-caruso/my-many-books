// ================================================================
// tests/middleware/requestLogger.test.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  RequestLogger,
  RequestLogEntry,
  withRequestLogging,
  requestLogger,
} from '../../../src/middleware/requestLogger';

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('RequestLogger Middleware', () => {
  let mockEvent: APIGatewayProxyEvent;
  let logger: RequestLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env['LOG_LEVEL'];
    
    // Reset singleton instance
    (RequestLogger as any).instance = undefined;
    logger = RequestLogger.getInstance();

    mockEvent = {
      httpMethod: 'GET',
      path: '/api/test',
      resource: '/api/test',
      pathParameters: { id: '123' },
      queryStringParameters: { limit: '10', page: '1' },
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'test-agent',
        'Authorization': 'Bearer token123',
        'X-Api-Key': 'secret-key',
      },
      requestContext: {
        requestId: 'test-request-id',
        identity: {
          sourceIp: '192.168.1.1',
        },
      },
    } as any;
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
    mockConsoleWarn.mockClear();
    mockConsoleError.mockClear();
  });

  describe('RequestLogger Singleton', () => {
    it('should create singleton instance', () => {
      const instance1 = RequestLogger.getInstance();
      const instance2 = RequestLogger.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should use default log level when not set', () => {
      delete process.env['LOG_LEVEL'];
      const instance = RequestLogger.getInstance();

      expect((instance as any).logLevel).toBe('basic');
    });

    it('should use environment log level', () => {
      process.env['LOG_LEVEL'] = 'detailed';
      (RequestLogger as any).instance = undefined;
      const instance = RequestLogger.getInstance();

      expect((instance as any).logLevel).toBe('detailed');
    });
  });

  describe('logRequest', () => {
    it('should create log entry with all required fields', () => {
      const logEntry = logger.logRequest(mockEvent);

      expect(logEntry).toEqual({
        requestId: 'test-request-id',
        method: 'GET',
        resource: '/api/test',
        path: '/api/test',
        queryStringParameters: { limit: '10', page: '1' },
        pathParameters: { id: '123' },
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'test-agent',
          'Authorization': '[REDACTED]',
          'X-Api-Key': '[REDACTED]',
        },
        sourceIp: '192.168.1.1',
        userAgent: 'test-agent',
        timestamp: expect.any(String),
      });
    });

    it('should handle missing User-Agent header', () => {
      delete mockEvent.headers['User-Agent'];
      delete mockEvent.headers['user-agent'];

      const logEntry = logger.logRequest(mockEvent);

      expect(logEntry.userAgent).toBe('Unknown');
    });

    it('should handle lowercase user-agent header', () => {
      delete mockEvent.headers['User-Agent'];
      mockEvent.headers['user-agent'] = 'lowercase-agent';

      const logEntry = logger.logRequest(mockEvent);

      expect(logEntry.userAgent).toBe('lowercase-agent');
    });

    it('should sanitize sensitive headers', () => {
      mockEvent.headers = {
        'authorization': 'Bearer token',
        'x-api-key': 'secret',
        'x-amz-security-token': 'aws-token',
        'cookie': 'session=abc123',
        'content-type': 'application/json',
      };

      const logEntry = logger.logRequest(mockEvent);

      expect(logEntry.headers).toEqual({
        'authorization': '[REDACTED]',
        'x-api-key': '[REDACTED]',
        'x-amz-security-token': '[REDACTED]',
        'cookie': '[REDACTED]',
        'content-type': 'application/json',
      });
    });

    it('should handle case-insensitive sensitive headers', () => {
      mockEvent.headers = {
        'AUTHORIZATION': 'Bearer token',
        'X-API-KEY': 'secret',
        'Cookie': 'session=abc123',
      };

      const logEntry = logger.logRequest(mockEvent);

      expect(logEntry.headers).toEqual({
        'AUTHORIZATION': '[REDACTED]',
        'X-API-KEY': '[REDACTED]',
        'Cookie': '[REDACTED]',
      });
    });

    it('should handle null query and path parameters', () => {
      mockEvent.queryStringParameters = null;
      mockEvent.pathParameters = null;

      const logEntry = logger.logRequest(mockEvent);

      expect(logEntry.queryStringParameters).toBeNull();
      expect(logEntry.pathParameters).toBeNull();
    });

    describe('Logging Levels', () => {
      it('should log basic info when log level is basic', () => {
        process.env['LOG_LEVEL'] = 'basic';
        (RequestLogger as any).instance = undefined;
        logger = RequestLogger.getInstance();

        logger.logRequest(mockEvent);

        expect(mockConsoleLog).toHaveBeenCalledWith('Incoming request:', {
          requestId: 'test-request-id',
          method: 'GET',
          resource: '/api/test',
          sourceIp: '192.168.1.1',
        });
      });

      it('should log detailed info when log level is detailed', () => {
        process.env['LOG_LEVEL'] = 'detailed';
        (RequestLogger as any).instance = undefined;
        logger = RequestLogger.getInstance();

        logger.logRequest(mockEvent);

        expect(mockConsoleLog).toHaveBeenCalledWith('Incoming request:', {
          requestId: 'test-request-id',
          method: 'GET',
          resource: '/api/test',
          sourceIp: '192.168.1.1',
          queryStringParameters: { limit: '10', page: '1' },
          pathParameters: { id: '123' },
          userAgent: 'test-agent',
        });
      });

      it('should not log when log level is none', () => {
        process.env['LOG_LEVEL'] = 'none';
        (RequestLogger as any).instance = undefined;
        logger = RequestLogger.getInstance();

        logger.logRequest(mockEvent);

        expect(mockConsoleLog).not.toHaveBeenCalled();
      });
    });
  });

  describe('logResponse', () => {
    let logEntry: RequestLogEntry;
    let mockResponse: APIGatewayProxyResult;
    let startTime: number;

    beforeEach(() => {
      logEntry = {
        requestId: 'test-request-id',
        method: 'GET',
        resource: '/api/test',
        path: '/api/test',
        queryStringParameters: null,
        pathParameters: null,
        headers: {},
        sourceIp: '192.168.1.1',
        userAgent: 'test-agent',
        timestamp: new Date().toISOString(),
      };

      mockResponse = {
        statusCode: 200,
        body: JSON.stringify({ data: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      };

      startTime = Date.now() - 100; // 100ms ago
    });

    it('should update log entry with response information', () => {
      logger.logResponse(logEntry, mockResponse, startTime);

      expect(logEntry.responseTime).toBeGreaterThan(0);
      expect(logEntry.statusCode).toBe(200);
      expect(logEntry.responseSize).toBe(Buffer.byteLength('{"data":"test"}', 'utf8'));
    });

    it('should log successful response', () => {
      logger.logResponse(logEntry, mockResponse, startTime);

      expect(mockConsoleLog).toHaveBeenCalledWith('Request completed:', {
        requestId: 'test-request-id',
        method: 'GET',
        resource: '/api/test',
        statusCode: 200,
        responseTime: expect.stringMatching(/\d+ms/),
        responseSize: expect.stringMatching(/\d+ bytes/),
      });
    });

    it('should log warning for 4xx status codes', () => {
      mockResponse.statusCode = 400;
      logger.logResponse(logEntry, mockResponse, startTime);

      expect(mockConsoleWarn).toHaveBeenCalledWith('Request completed:', expect.any(Object));
    });

    it('should log error for 5xx status codes', () => {
      mockResponse.statusCode = 500;
      logger.logResponse(logEntry, mockResponse, startTime);

      expect(mockConsoleError).toHaveBeenCalledWith('Request completed:', expect.any(Object));
    });

    it('should include detailed info when log level is detailed', () => {
      process.env['LOG_LEVEL'] = 'detailed';
      (RequestLogger as any).instance = undefined;
      logger = RequestLogger.getInstance();

      logger.logResponse(logEntry, mockResponse, startTime);

      expect(mockConsoleLog).toHaveBeenCalledWith('Request completed:', {
        requestId: 'test-request-id',
        method: 'GET',
        resource: '/api/test',
        statusCode: 200,
        responseTime: expect.stringMatching(/\d+ms/),
        responseSize: expect.stringMatching(/\d+ bytes/),
        sourceIp: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });

    it('should not log when log level is none', () => {
      process.env['LOG_LEVEL'] = 'none';
      (RequestLogger as any).instance = undefined;
      logger = RequestLogger.getInstance();

      logger.logResponse(logEntry, mockResponse, startTime);

      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should handle response with no body', () => {
      mockResponse.body = undefined as any;
      logger.logResponse(logEntry, mockResponse, startTime);

      expect(logEntry.responseSize).toBe(0);
    });

    it('should detect and log slow requests', () => {
      const slowStartTime = Date.now() - 6000; // 6 seconds ago
      logger.logResponse(logEntry, mockResponse, slowStartTime);

      expect(mockConsoleWarn).toHaveBeenCalledWith('Slow request detected:', {
        requestId: 'test-request-id',
        method: 'GET',
        resource: '/api/test',
        responseTime: expect.stringMatching(/\d+ms/),
      });
    });
  });

  describe('logError', () => {
    let logEntry: RequestLogEntry;

    beforeEach(() => {
      logEntry = {
        requestId: 'test-request-id',
        method: 'GET',
        resource: '/api/test',
        path: '/api/test',
        queryStringParameters: null,
        pathParameters: null,
        headers: {},
        sourceIp: '192.168.1.1',
        userAgent: 'test-agent',
        timestamp: new Date().toISOString(),
      };
    });

    it('should log error with full details', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      logger.logError(logEntry, error);

      expect(mockConsoleError).toHaveBeenCalledWith('Request error:', {
        requestId: 'test-request-id',
        method: 'GET',
        resource: '/api/test',
        error: {
          name: 'Error',
          message: 'Test error',
          stack: 'Error stack trace',
        },
      });
    });

    it('should handle error without stack trace', () => {
      const error = new Error('Test error');
      delete error.stack;

      logger.logError(logEntry, error);

      expect(mockConsoleError).toHaveBeenCalledWith('Request error:', {
        requestId: 'test-request-id',
        method: 'GET',
        resource: '/api/test',
        error: {
          name: 'Error',
          message: 'Test error',
          stack: undefined,
        },
      });
    });
  });

  describe('withRequestLogging', () => {
    it('should wrap handler with logging functionality', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
        headers: {},
      });

      const wrappedHandler = withRequestLogging(mockHandler);
      const result = await wrappedHandler(mockEvent);

      expect(mockHandler).toHaveBeenCalledWith(mockEvent);
      expect(result.statusCode).toBe(200);
      expect(mockConsoleLog).toHaveBeenCalledTimes(2); // Request + Response logs
    });

    it('should log errors and re-throw them', async () => {
      const error = new Error('Handler error');
      const mockHandler = jest.fn().mockRejectedValue(error);

      const wrappedHandler = withRequestLogging(mockHandler);

      await expect(wrappedHandler(mockEvent)).rejects.toThrow('Handler error');
      expect(mockConsoleError).toHaveBeenCalledWith('Request error:', expect.any(Object));
    });

    it('should measure response time accurately', async () => {
      const mockHandler = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          statusCode: 200,
          body: '',
          headers: {},
        };
      });

      const wrappedHandler = withRequestLogging(mockHandler);
      await wrappedHandler(mockEvent);

      const responseLogCall = mockConsoleLog.mock.calls.find(call => 
        call[0] === 'Request completed:'
      );
      
      expect(responseLogCall).toBeDefined();
      const responseTime = responseLogCall![1].responseTime;
      expect(responseTime).toMatch(/\d+ms/);
    });
  });

  describe('requestLogger convenience function', () => {
    it('should be a convenience wrapper for getInstance().logRequest()', () => {
      const logEntry = requestLogger(mockEvent);

      expect(logEntry.requestId).toBe('test-request-id');
      expect(logEntry.method).toBe('GET');
      expect(logEntry.resource).toBe('/api/test');
    });
  });

  describe('Edge Cases', () => {
    it('should handle event with missing requestContext', () => {
      const eventWithoutContext = { ...mockEvent };
      delete (eventWithoutContext as any).requestContext;

      expect(() => logger.logRequest(eventWithoutContext as any)).toThrow();
    });

    it('should handle event with missing identity', () => {
      const eventWithoutIdentity = {
        ...mockEvent,
        requestContext: {
          ...mockEvent.requestContext,
          identity: undefined,
        },
      };

      expect(() => logger.logRequest(eventWithoutIdentity as any)).toThrow();
    });

    it('should handle headers as undefined', () => {
      const eventWithoutHeaders = { 
        ...mockEvent,
        headers: undefined as any
      };

      const logEntry = logger.logRequest(eventWithoutHeaders as any);

      expect(logEntry.userAgent).toBe('Unknown');
      expect(logEntry.headers).toEqual({});
    });

    it('should handle empty headers object', () => {
      mockEvent.headers = {};

      const logEntry = logger.logRequest(mockEvent);

      expect(logEntry.userAgent).toBe('Unknown');
      expect(logEntry.headers).toEqual({});
    });
  });
});