// ================================================================
// tests/integration/handlers/router.test.ts
// Integration tests for Router Lambda handler
// ================================================================

import { APIGatewayProxyEvent } from 'aws-lambda';
import { routeRequest } from '../../../src/handlers/router';

// Mock the database connection to avoid requiring a real database for route tests
jest.mock('../../../src/config/database', () => ({
  default: {
    getInstance: jest.fn(() => ({
      authenticate: jest.fn().mockResolvedValue(undefined),
      sync: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

// Mock the ModelManager from models index to avoid database requirements
jest.mock('../../../src/models', () => ({
  ModelManager: {
    initialize: jest.fn(),
    syncDatabase: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Router Handler Integration', () => {

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

  describe('Health route', () => {
    it('should handle health check route', async () => {
      const event = createMockEvent({
        httpMethod: 'GET',
        resource: '/health',
      });

      const result = await routeRequest(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.message).toBe('API is healthy');
      expect(responseBody.timestamp).toBeDefined();
      expect(responseBody.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Route not found', () => {
    it('should handle unknown routes', async () => {
      const event = createMockEvent({
        httpMethod: 'GET',
        resource: '/unknown-route',
        path: '/unknown-route',
      });

      const result = await routeRequest(event);

      expect(result.statusCode).toBe(404);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toBe('Route not found');
      expect(responseBody.path).toBe('/unknown-route');
      expect(responseBody.method).toBe('GET');
    });

    it('should handle unsupported methods', async () => {
      const event = createMockEvent({
        httpMethod: 'PATCH',
        resource: '/health',
      });

      const result = await routeRequest(event);

      expect(result.statusCode).toBe(404);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toBe('Route not found');
    });
  });

  describe('CORS handling', () => {
    it('should handle OPTIONS requests', async () => {
      const event = createMockEvent({
        httpMethod: 'OPTIONS',
        resource: '/health',
      });

      const result = await routeRequest(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      });
    });

    it('should add CORS headers to all responses', async () => {
      const event = createMockEvent({
        httpMethod: 'GET',
        resource: '/health',
      });

      const result = await routeRequest(event);

      expect(result.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
      });
    });
  });

  describe('Error handling', () => {
    it('should handle invalid route gracefully', async () => {
      const event = createMockEvent({
        httpMethod: 'GET',
        resource: '/invalid/route/with/multiple/parts',
        path: '/invalid/route/with/multiple/parts',
      });

      const result = await routeRequest(event);

      expect(result.statusCode).toBe(404);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
    });
  });
});