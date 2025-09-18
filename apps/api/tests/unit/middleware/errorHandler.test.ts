// ================================================================
// tests/middleware/errorHandler.test.ts
// ================================================================

import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  createErrorResponse,
  asyncHandler,
  errorHandler,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ServiceUnavailableError,
  AppError,
} from '../../../src/middleware/errorHandler';

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('ErrorHandler Middleware', () => {
  let mockEvent: APIGatewayProxyEvent;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEvent = {
      httpMethod: 'GET',
      path: '/test',
      resource: '/test',
      requestContext: {
        requestId: 'test-request-id',
      },
    } as any;
  });

  afterEach(() => {
    mockConsoleError.mockClear();
  });

  describe('Error Classes', () => {
    describe('ValidationError', () => {
      it('should create validation error with correct properties', () => {
        const error = new ValidationError('Invalid input', { field: 'email' });

        expect(error.name).toBe('ValidationError');
        expect(error.message).toBe('Invalid input');
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
        expect(error.details).toEqual({ field: 'email' });
      });

      it('should create validation error without details', () => {
        const error = new ValidationError('Invalid input');

        expect(error.details).toBeUndefined();
      });
    });

    describe('NotFoundError', () => {
      it('should create not found error with default message', () => {
        const error = new NotFoundError();

        expect(error.name).toBe('NotFoundError');
        expect(error.message).toBe('Resource not found');
        expect(error.statusCode).toBe(404);
        expect(error.isOperational).toBe(true);
      });

      it('should create not found error with custom message', () => {
        const error = new NotFoundError('User not found');

        expect(error.message).toBe('User not found');
      });
    });

    describe('ConflictError', () => {
      it('should create conflict error', () => {
        const error = new ConflictError('Resource already exists');

        expect(error.name).toBe('ConflictError');
        expect(error.message).toBe('Resource already exists');
        expect(error.statusCode).toBe(409);
        expect(error.isOperational).toBe(true);
      });
    });

    describe('UnauthorizedError', () => {
      it('should create unauthorized error with default message', () => {
        const error = new UnauthorizedError();

        expect(error.name).toBe('UnauthorizedError');
        expect(error.message).toBe('Unauthorized');
        expect(error.statusCode).toBe(401);
        expect(error.isOperational).toBe(true);
      });

      it('should create unauthorized error with custom message', () => {
        const error = new UnauthorizedError('Invalid token');

        expect(error.message).toBe('Invalid token');
      });
    });

    describe('ForbiddenError', () => {
      it('should create forbidden error with default message', () => {
        const error = new ForbiddenError();

        expect(error.name).toBe('ForbiddenError');
        expect(error.message).toBe('Forbidden');
        expect(error.statusCode).toBe(403);
        expect(error.isOperational).toBe(true);
      });

      it('should create forbidden error with custom message', () => {
        const error = new ForbiddenError('Insufficient permissions');

        expect(error.message).toBe('Insufficient permissions');
      });
    });

    describe('ServiceUnavailableError', () => {
      it('should create service unavailable error with default message', () => {
        const error = new ServiceUnavailableError();

        expect(error.name).toBe('ServiceUnavailableError');
        expect(error.message).toBe('Service temporarily unavailable');
        expect(error.statusCode).toBe(503);
        expect(error.isOperational).toBe(true);
      });

      it('should create service unavailable error with custom message', () => {
        const error = new ServiceUnavailableError('Database connection failed');

        expect(error.message).toBe('Database connection failed');
      });
    });
  });

  describe('createErrorResponse', () => {
    beforeEach(() => {
      delete process.env['NODE_ENV'];
    });

    it('should create error response for ValidationError', () => {
      const error = new ValidationError('Invalid email format', { field: 'email' });
      const response = createErrorResponse(error, mockEvent);

      expect(response.statusCode).toBe(400);
      expect(response.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });

      const body = JSON.parse(response.body);
      expect(body).toEqual({
        success: false,
        error: 'Invalid email format',
        details: { field: 'email' },
        requestId: 'test-request-id',
      });
    });

    it('should create error response for NotFoundError', () => {
      const error = new NotFoundError('User not found');
      const response = createErrorResponse(error, mockEvent);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('User not found');
    });

    it('should create error response for generic Error', () => {
      const error = new Error('Something went wrong');
      const response = createErrorResponse(error, mockEvent);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Something went wrong');
      expect(body.stack).toBeDefined();
    });

    it('should hide stack trace in production for non-operational errors', () => {
      process.env['NODE_ENV'] = 'production';
      const error = new Error('Internal error');
      const response = createErrorResponse(error, mockEvent);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
      expect(body.stack).toBeUndefined();
    });

    it('should show operational errors in production', () => {
      process.env['NODE_ENV'] = 'production';
      const error = new ValidationError('Invalid input');
      const response = createErrorResponse(error, mockEvent);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid input');
    });

    it('should include stack trace in development for all errors', () => {
      process.env['NODE_ENV'] = 'development';
      const error = new Error('Test error');
      const response = createErrorResponse(error, mockEvent);

      const body = JSON.parse(response.body);
      expect(body.stack).toBeDefined();
    });

    it('should work without event parameter', () => {
      const error = new ValidationError('Test error');
      const response = createErrorResponse(error);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Test error');
      expect(body.requestId).toBeUndefined();
    });

    it('should handle error with custom statusCode', () => {
      const error = new Error('Custom error') as AppError;
      error.statusCode = 418;
      error.isOperational = true;

      const response = createErrorResponse(error, mockEvent);

      expect(response.statusCode).toBe(418);
    });

    it('should log error details', () => {
      const error = new ValidationError('Test error');
      createErrorResponse(error, mockEvent);

      expect(mockConsoleError).toHaveBeenCalledWith('Error occurred:', {
        name: 'ValidationError',
        message: 'Test error',
        statusCode: 400,
        isOperational: true,
        stack: error.stack,
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id',
      });
    });

    it('should handle event without requestContext', () => {
      const eventWithoutContext = { ...mockEvent, requestContext: undefined };
      const error = new Error('Test error');
      
      const response = createErrorResponse(error, eventWithoutContext as any);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.requestId).toBeUndefined();
    });
  });

  describe('asyncHandler', () => {
    it('should execute handler successfully', async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({ success: true }),
        headers: {},
      });

      const wrappedHandler = asyncHandler(mockHandler);
      const result = await wrappedHandler(mockEvent);

      expect(mockHandler).toHaveBeenCalledWith(mockEvent);
      expect(result.statusCode).toBe(200);
    });

    it('should catch and handle errors', async () => {
      const error = new ValidationError('Invalid input');
      const mockHandler = jest.fn().mockRejectedValue(error);

      const wrappedHandler = asyncHandler(mockHandler);
      const result = await wrappedHandler(mockEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid input');
    });

    it('should handle non-Error objects', async () => {
      const mockHandler = jest.fn().mockRejectedValue('String error');

      const wrappedHandler = asyncHandler(mockHandler);
      const result = await wrappedHandler(mockEvent);

      expect(result.statusCode).toBe(500);
    });
  });

  describe('errorHandler function', () => {
    it('should be a convenience wrapper for createErrorResponse', () => {
      const error = new NotFoundError('Resource not found');
      const response = errorHandler(error, mockEvent);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Resource not found');
    });

    it('should work without event parameter', () => {
      const error = new ValidationError('Test error');
      const response = errorHandler(error);

      expect(response.statusCode).toBe(400);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in all error responses', () => {
      const error = new Error('Test error');
      const response = createErrorResponse(error, mockEvent);

      expect(response.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null error', () => {
      const response = createErrorResponse(new Error('fallback') as any, mockEvent);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('fallback');
    });

    it('should handle undefined error', () => {
      const response = createErrorResponse(new Error('undefined fallback') as any, mockEvent);

      expect(response.statusCode).toBe(500);
    });

    it('should handle error with no message', () => {
      const error = new Error();
      const response = createErrorResponse(error, mockEvent);

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('');
    });

    it('should handle AppError with false isOperational in production', () => {
      process.env['NODE_ENV'] = 'production';
      const error = new Error('Internal details') as AppError;
      error.statusCode = 500;
      error.isOperational = false;

      const response = createErrorResponse(error, mockEvent);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });
  });
});