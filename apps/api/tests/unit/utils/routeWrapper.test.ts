// ================================================================
// tests/utils/routeWrapper.test.ts
// ================================================================

import { Request, Response, NextFunction } from 'express';
import { expressRouteWrapper } from '../../../src/utils/routeWrapper';
import { ApiResponse } from '../../../src/common/ApiResponse';

// UniversalRequest interface is used in the tests but imported from the source
// interface UniversalRequest {
//   body?: any;
//   queryStringParameters?: { [key: string]: string | undefined };
//   params?: { [key: string]: string | undefined };
//   user: { id: number };
// }

describe('expressRouteWrapper', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockControllerMethod: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: undefined,
      query: {},
      params: {},
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    
    mockNext = jest.fn();
    mockControllerMethod = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful responses', () => {
    it('should handle 200 response with data', async () => {
      const apiResponse: ApiResponse = {
        statusCode: 200,
        success: true,
        data: { id: 1, title: 'Test Book' },
        message: 'Success',
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, title: 'Test Book' },
        message: 'Success',
      });
    });

    it('should handle 201 response for creation', async () => {
      const apiResponse: ApiResponse = {
        statusCode: 201,
        success: true,
        data: { id: 1 },
        message: 'Created successfully',
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1 },
        message: 'Created successfully',
      });
    });

    it('should handle 204 response with no content', async () => {
      const apiResponse: ApiResponse = {
        statusCode: 204,
        success: true,
        message: 'Deleted successfully',
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalledWith();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should handle response with pagination meta', async () => {
      const apiResponse: ApiResponse = {
        statusCode: 200,
        success: true,
        data: [{ id: 1 }, { id: 2 }],
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1 }, { id: 2 }],
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });
    });
  });

  describe('error responses', () => {
    it('should handle 400 validation error', async () => {
      const apiResponse: ApiResponse = {
        statusCode: 400,
        success: false,
        error: 'Validation failed',
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
      });
    });

    it('should handle 404 not found error', async () => {
      const apiResponse: ApiResponse = {
        statusCode: 404,
        success: false,
        error: 'Resource not found',
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource not found',
      });
    });

    it('should handle 500 internal server error from controller', async () => {
      const apiResponse: ApiResponse = {
        statusCode: 500,
        success: false,
        error: 'Database connection failed',
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection failed',
      });
    });
  });

  describe('request transformation', () => {
    it('should convert Express request to UniversalRequest format', async () => {
      mockReq = {
        body: { title: 'Test Book', isbnCode: '123456' },
        query: { page: '1', limit: '10' },
        params: { id: '123' },
      };
      // Add user separately to avoid TypeScript error
      (mockReq as any).user = { id: 456 };

      const apiResponse: ApiResponse = {
        statusCode: 200,
        success: true,
        data: {},
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockControllerMethod).toHaveBeenCalledWith({
        body: JSON.stringify({ title: 'Test Book', isbnCode: '123456' }),
        queryStringParameters: { page: '1', limit: '10' },
        params: { id: '123' },
        user: { id: 456 },
      });
    });

    it('should handle request with undefined body', async () => {
      mockReq = {
        body: undefined,
        query: {},
        params: {},
      };

      const apiResponse: ApiResponse = {
        statusCode: 200,
        success: true,
        data: {},
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockControllerMethod).toHaveBeenCalledWith({
        body: undefined,
        queryStringParameters: {},
        params: {},
        user: undefined,
      });
    });

    it('should handle request with empty body', async () => {
      mockReq = {
        body: {},
        query: {},
        params: {},
      };

      const apiResponse: ApiResponse = {
        statusCode: 200,
        success: true,
        data: {},
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockControllerMethod).toHaveBeenCalledWith({
        body: undefined,
        queryStringParameters: {},
        params: {},
        user: undefined,
      });
    });

    it('should handle request with complex query parameters', async () => {
      mockReq = {
        body: undefined,
        query: {
          filters: '{"title":"test"}',
          includeAuthors: 'true',
          includeCategories: 'false',
        },
        params: {},
      };

      const apiResponse: ApiResponse = {
        statusCode: 200,
        success: true,
        data: {},
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockControllerMethod).toHaveBeenCalledWith({
        body: undefined,
        queryStringParameters: {
          filters: '{"title":"test"}',
          includeAuthors: 'true',
          includeCategories: 'false',
        },
        params: {},
        user: undefined,
      });
    });
  });

  describe('exception handling', () => {
    it('should forward controller errors to next middleware', async () => {
      const error = new Error('Controller method failed');
      mockControllerMethod.mockRejectedValue(error);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockRes.send).not.toHaveBeenCalled();
    });

    it('should forward non-Error rejections as-is', async () => {
      const error = 'String error';
      mockControllerMethod.mockRejectedValue(error);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should forward undefined rejections', async () => {
      mockControllerMethod.mockRejectedValue(undefined);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(undefined);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('response field inclusion', () => {
    it('should include only success and data when no error or message', async () => {
      const apiResponse: ApiResponse = {
        statusCode: 200,
        success: true,
        data: { id: 1 },
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1 },
      });
    });

    it('should include error field when present', async () => {
      const apiResponse: ApiResponse = {
        statusCode: 400,
        success: false,
        error: 'Bad request',
        data: null,
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: 'Bad request',
      });
    });

    it('should include message field when present', async () => {
      const apiResponse: ApiResponse = {
        statusCode: 201,
        success: true,
        data: { id: 1 },
        message: 'Resource created successfully',
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1 },
        message: 'Resource created successfully',
      });
    });

    it('should include both error and message when both present', async () => {
      const apiResponse: ApiResponse = {
        statusCode: 400,
        success: false,
        error: 'Validation failed',
        message: 'Please check your input',
      };

      mockControllerMethod.mockResolvedValue(apiResponse);

      const wrappedHandler = expressRouteWrapper(mockControllerMethod);
      await wrappedHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        message: 'Please check your input',
      });
    });
  });
});
