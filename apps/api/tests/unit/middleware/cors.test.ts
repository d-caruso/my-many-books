// ================================================================
// tests/middleware/cors.test.ts
// ================================================================

import { APIGatewayProxyResult } from 'aws-lambda';
import {
  getCorsHeaders,
  createCorsResponse,
  handleOptionsRequest,
  addCorsToResponse,
  corsHandler,
  CorsOptions,
} from '../../../src/middleware/cors';

describe('CORS Middleware', () => {
  describe('getCorsHeaders', () => {
    it('should return default CORS headers when no options provided', () => {
      const headers = getCorsHeaders();

      expect(headers).toEqual({
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Max-Age': '86400',
      });
    });

    it('should merge custom options with defaults', () => {
      const options: CorsOptions = {
        origin: 'https://example.com',
        methods: ['GET', 'POST'],
        credentials: true,
      };

      const headers = getCorsHeaders(options);

      expect(headers).toEqual({
        'Access-Control-Allow-Methods': 'GET,POST',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
        'Access-Control-Allow-Origin': 'https://example.com',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      });
    });

    it('should handle array of origins', () => {
      const options: CorsOptions = {
        origin: ['https://example.com', 'https://test.com'],
      };

      const headers = getCorsHeaders(options);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    });

    it('should handle empty array of origins', () => {
      const options: CorsOptions = {
        origin: [],
      };

      const headers = getCorsHeaders(options);

      expect(headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should handle custom allowed headers', () => {
      const options: CorsOptions = {
        allowedHeaders: ['Content-Type', 'X-Custom-Header'],
      };

      const headers = getCorsHeaders(options);

      expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type,X-Custom-Header');
    });

    it('should handle custom max age', () => {
      const options: CorsOptions = {
        maxAge: 3600,
      };

      const headers = getCorsHeaders(options);

      expect(headers['Access-Control-Max-Age']).toBe('3600');
    });

    it('should not include credentials header when false', () => {
      const options: CorsOptions = {
        credentials: false,
      };

      const headers = getCorsHeaders(options);

      expect(headers).not.toHaveProperty('Access-Control-Allow-Credentials');
    });

    it('should handle undefined maxAge', () => {
      const options: CorsOptions = {};

      const headers = getCorsHeaders(options);

      expect(headers['Access-Control-Max-Age']).toBe('86400');
    });
  });

  describe('createCorsResponse', () => {
    it('should create response with default parameters', () => {
      const response = createCorsResponse();

      expect(response).toEqual({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Max-Age': '86400',
        },
        body: '',
      });
    });

    it('should create response with custom parameters', () => {
      const response = createCorsResponse(
        201,
        JSON.stringify({ success: true }),
        { 'X-Custom': 'value' },
        { origin: 'https://example.com' }
      );

      expect(response.statusCode).toBe(201);
      expect(response.body).toBe('{"success":true}');
      expect(response.headers).toMatchObject({
        'Content-Type': 'application/json',
        'X-Custom': 'value',
        'Access-Control-Allow-Origin': 'https://example.com',
      });
    });

    it('should merge additional headers with CORS headers', () => {
      const response = createCorsResponse(
        200,
        '',
        { 'Cache-Control': 'no-cache', 'X-Rate-Limit': '100' }
      );

      expect(response.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Rate-Limit': '100',
        'Access-Control-Allow-Origin': '*',
      });
    });
  });

  describe('handleOptionsRequest', () => {
    it('should return OPTIONS response with default CORS headers', () => {
      const response = handleOptionsRequest();

      expect(response).toEqual({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Max-Age': '86400',
        },
        body: '',
      });
    });

    it('should return OPTIONS response with custom CORS options', () => {
      const options: CorsOptions = {
        origin: 'https://example.com',
        methods: ['GET', 'POST'],
        maxAge: 3600,
      };

      const response = handleOptionsRequest(options);

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('');
      expect(response.headers).toMatchObject({
        'Access-Control-Allow-Origin': 'https://example.com',
        'Access-Control-Allow-Methods': 'GET,POST',
        'Access-Control-Max-Age': '3600',
      });
    });
  });

  describe('addCorsToResponse', () => {
    it('should add CORS headers to existing response', () => {
      const originalResponse: APIGatewayProxyResult = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Custom': 'value',
        },
        body: JSON.stringify({ data: 'test' }),
      };

      const response = addCorsToResponse(originalResponse);

      expect(response).toEqual({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Custom': 'value',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Max-Age': '86400',
        },
        body: '{"data":"test"}',
      });
    });

    it('should override existing CORS headers', () => {
      const originalResponse: APIGatewayProxyResult = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://old.com',
        },
        body: '',
      };

      const response = addCorsToResponse(originalResponse, {
        origin: 'https://new.com',
      });

      expect(response.headers!['Access-Control-Allow-Origin']).toBe('https://new.com');
    });

    it('should handle response with no headers', () => {
      const originalResponse: APIGatewayProxyResult = {
        statusCode: 200,
        body: '',
      };

      const response = addCorsToResponse(originalResponse);

      expect(response.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      });
    });

    it('should preserve all original response properties', () => {
      const originalResponse: APIGatewayProxyResult = {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Not found' }),
        isBase64Encoded: true,
      };

      const response = addCorsToResponse(originalResponse);

      expect(response.statusCode).toBe(404);
      expect(response.body).toBe('{"error":"Not found"}');
      expect(response.isBase64Encoded).toBe(true);
    });
  });

  describe('corsHandler', () => {
    it('should return OPTIONS response', () => {
      const event = { httpMethod: 'OPTIONS' };
      const response = corsHandler(event);

      expect(response).toEqual({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Max-Age': '86400',
        },
        body: '',
      });
    });

    it('should accept custom CORS options', () => {
      const event = { httpMethod: 'OPTIONS' };
      const options: CorsOptions = {
        origin: 'https://example.com',
        credentials: true,
      };

      const response = corsHandler(event, options);

      expect(response.headers).toMatchObject({
        'Access-Control-Allow-Origin': 'https://example.com',
        'Access-Control-Allow-Credentials': 'true',
      });
    });

    it('should work with any event format', () => {
      const event = null;
      const response = corsHandler(event);

      expect(response.statusCode).toBe(200);
      expect(response.headers!['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-array methods in options', () => {
      const options = {
        methods: 'GET' as any, // Invalid type
      };

      const headers = getCorsHeaders(options);

      expect(headers['Access-Control-Allow-Methods']).toBe('GET,POST,PUT,DELETE,OPTIONS');
    });

    it('should handle non-array allowedHeaders in options', () => {
      const options = {
        allowedHeaders: 'Content-Type' as any, // Invalid type
      };

      const headers = getCorsHeaders(options);

      expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token');
    });

    it('should handle zero maxAge', () => {
      const options: CorsOptions = {
        maxAge: 0,
      };

      const headers = getCorsHeaders(options);

      expect(headers).not.toHaveProperty('Access-Control-Max-Age');
    });
  });
});