// ================================================================
// tests/integration/handlers/health.test.ts
// Integration tests for Health Lambda handlers
// ================================================================

import { APIGatewayProxyEvent } from 'aws-lambda';
import * as healthHandler from '../../../src/handlers/health';

describe('Health Handler Integration', () => {
  // Helper function to create mock API Gateway event
  const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    path: '/health',
    pathParameters: null,
    queryStringParameters: null,
    body: null,
    headers: {},
    requestContext: {
      requestId: 'test-request-id',
      requestTime: '09/Apr/2015:12:34:56 +0000',
      requestTimeEpoch: 1428582896000,
      httpMethod: 'GET',
      path: '/health',
      protocol: 'HTTP/1.1',
      resourcePath: '/health',
      stage: 'test',
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'Custom User Agent String',
        accountId: '123456789012',
        apiKey: 'test-api-key',
        accessKey: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        user: null,
        userArn: null,
      },
      accountId: '123456789012',
      resourceId: '123456',
      apiId: '1234567890',
    } as any,
    resource: '/health',
    stageVariables: null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    ...overrides,
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const event = createMockEvent();
      const result = await healthHandler.healthCheck(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      });

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('healthy');
      expect(body.data.timestamp).toBeDefined();
      expect(body.data.uptime).toBeGreaterThanOrEqual(0);
      expect(body.data.services.database).toBe('healthy');
      expect(body.data.services.isbnService).toBe('healthy');
    });

    it('should include environment information', async () => {
      // Mock environment variables
      const originalNodeEnv = process.env['NODE_ENV'];
      const originalAppVersion = process.env['APP_VERSION'];
      process.env['NODE_ENV'] = 'test';
      process.env['APP_VERSION'] = '2.0.0';

      const event = createMockEvent();
      const result = await healthHandler.healthCheck(event);

      const body = JSON.parse(result.body);
      expect(body.data.environment).toBe('test');
      expect(body.data.version).toBe('2.0.0');

      // Clean up
      process.env['NODE_ENV'] = originalNodeEnv;
      process.env['APP_VERSION'] = originalAppVersion;
    });

    it('should use default values when environment variables are not set', async () => {
      const originalNodeEnv = process.env['NODE_ENV'];
      const originalAppVersion = process.env['APP_VERSION'];
      delete process.env['NODE_ENV'];
      delete process.env['APP_VERSION'];

      const event = createMockEvent();
      const result = await healthHandler.healthCheck(event);

      const body = JSON.parse(result.body);
      expect(body.data.environment).toBe('development');
      expect(body.data.version).toBe('1.0.0');

      // Restore original values
      process.env['NODE_ENV'] = originalNodeEnv;
      process.env['APP_VERSION'] = originalAppVersion;
    });

    it('should handle internal errors', async () => {
      // Mock process.uptime to throw an error
      const originalUptime = process.uptime;
      process.uptime = jest.fn(() => {
        throw new Error('Uptime error');
      });

      const event = createMockEvent();
      const result = await healthHandler.healthCheck(event);

      expect(result.statusCode).toBe(503);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Service Unavailable');
      expect(body.message).toBe('Health check failed');

      // Restore original function
      process.uptime = originalUptime;
    });

    it('should include current timestamp in ISO format', async () => {
      const beforeCall = new Date().toISOString();
      const event = createMockEvent();
      const result = await healthHandler.healthCheck(event);
      const afterCall = new Date().toISOString();

      const body = JSON.parse(result.body);
      const timestamp = body.data.timestamp;

      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(timestamp >= beforeCall).toBe(true);
      expect(timestamp <= afterCall).toBe(true);
    });

    it('should handle OPTIONS requests', async () => {
      const event = createMockEvent({
        httpMethod: 'OPTIONS',
      });

      const result = await healthHandler.healthCheck(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      });
    });
  });

  describe('readinessCheck', () => {
    it('should return ready status', async () => {
      const event = createMockEvent();
      const result = await healthHandler.readinessCheck(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      });

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ready');
      expect(body.data.timestamp).toBeDefined();
      expect(body.data.checks.database).toBe(true);
      expect(body.data.checks.isbnService).toBe(true);
      expect(body.data.checks.memory).toBeDefined();
    });

    it('should include memory usage information', async () => {
      const event = createMockEvent();
      const result = await healthHandler.readinessCheck(event);

      const body = JSON.parse(result.body);
      const memory = body.data.checks.memory;

      expect(memory).toHaveProperty('rss');
      expect(memory).toHaveProperty('heapTotal');
      expect(memory).toHaveProperty('heapUsed');
      expect(memory).toHaveProperty('external');
      expect(memory).toHaveProperty('arrayBuffers');

      // All memory values should be positive numbers
      Object.values(memory).forEach((value) => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle internal errors', async () => {
      // Mock process.memoryUsage to throw an error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => {
        throw new Error('Memory usage error');
      }) as any;

      const event = createMockEvent();
      const result = await healthHandler.readinessCheck(event);

      expect(result.statusCode).toBe(503);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Service Unavailable');
      expect(body.message).toBe('Readiness check failed');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should include current timestamp in ISO format', async () => {
      const beforeCall = new Date().toISOString();
      const event = createMockEvent();
      const result = await healthHandler.readinessCheck(event);
      const afterCall = new Date().toISOString();

      const body = JSON.parse(result.body);
      const timestamp = body.data.timestamp;

      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(timestamp >= beforeCall).toBe(true);
      expect(timestamp <= afterCall).toBe(true);
    });

    it('should handle OPTIONS requests', async () => {
      const event = createMockEvent({
        httpMethod: 'OPTIONS',
      });

      const result = await healthHandler.readinessCheck(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      });
    });
  });

  describe('Response format consistency', () => {
    it('should return consistent success response format for health check', async () => {
      const event = createMockEvent();
      const result = await healthHandler.healthCheck(event);
      const body = JSON.parse(result.body);

      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
      expect(body.success).toBe(true);
      expect(typeof body.data).toBe('object');
    });

    it('should return consistent success response format for readiness check', async () => {
      const event = createMockEvent();
      const result = await healthHandler.readinessCheck(event);
      const body = JSON.parse(result.body);

      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
      expect(body.success).toBe(true);
      expect(typeof body.data).toBe('object');
    });

    it('should return consistent error response format', async () => {
      // Mock an error condition
      const originalUptime = process.uptime;
      process.uptime = jest.fn(() => {
        throw new Error('Test error');
      });

      const event = createMockEvent();
      const result = await healthHandler.healthCheck(event);
      const body = JSON.parse(result.body);

      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body.success).toBe(false);
      expect(typeof body.error).toBe('string');
      expect(typeof body.message).toBe('string');

      // Restore original function
      process.uptime = originalUptime;
    });
  });
});