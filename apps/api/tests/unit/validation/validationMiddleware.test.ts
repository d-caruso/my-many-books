/**
 * Validation Middleware Unit Tests
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import {
  validate,
  validateBody,
  validateQuery,
  validateParams,
} from '../../../src/validation/middleware/validationMiddleware';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      body: {},
      query: {},
      params: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();
  });

  describe('validate() - Body validation', () => {
    it('should pass validation with valid body', () => {
      const schema = {
        body: Joi.object({
          name: Joi.string().required(),
          age: Joi.number().required(),
        }),
      };

      mockRequest.body = { name: 'John', age: 30 };

      const middleware = validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid body', () => {
      const schema = {
        body: Joi.object({
          name: Joi.string().required(),
          age: Joi.number().required(),
        }),
      };

      mockRequest.body = { name: 'John' }; // Missing age

      const middleware = validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'age',
              message: expect.stringContaining('required'),
            }),
          ]),
        })
      );
    });

    it('should strip unknown fields when stripUnknown is true', () => {
      const schema = {
        body: Joi.object({
          name: Joi.string().required(),
        }),
      };

      mockRequest.body = { name: 'John', unknownField: 'value' };

      const middleware = validate(schema, { stripUnknown: true });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.validated?.body).toEqual({ name: 'John' });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should coerce types when possible', () => {
      const schema = {
        body: Joi.object({
          age: Joi.number().required(),
        }),
      };

      mockRequest.body = { age: '30' }; // String that can be coerced to number

      const middleware = validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.validated?.body.age).toBe(30); // Coerced to number
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validate() - Query validation', () => {
    it('should pass validation with valid query parameters', () => {
      const schema = {
        query: Joi.object({
          page: Joi.number().min(1).default(1),
          limit: Joi.number().min(1).max(100).default(20),
        }),
      };

      mockRequest.query = { page: '2', limit: '50' };

      const middleware = validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.validated?.query).toEqual({ page: 2, limit: 50 }); // Coerced to numbers
    });

    it('should apply defaults for missing query parameters', () => {
      const schema = {
        query: Joi.object({
          page: Joi.number().min(1).default(1),
          limit: Joi.number().min(1).max(100).default(20),
        }),
      };

      mockRequest.query = {};

      const middleware = validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.validated?.query).toEqual({ page: 1, limit: 20 }); // Applied defaults
    });

    it('should fail validation with invalid query parameters', () => {
      const schema = {
        query: Joi.object({
          page: Joi.number().min(1).required(),
        }),
      };

      mockRequest.query = { page: '0' }; // Invalid: less than minimum

      const middleware = validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('validate() - Params validation', () => {
    it('should pass validation with valid path parameters', () => {
      const schema = {
        params: Joi.object({
          id: Joi.number().integer().positive().required(),
        }),
      };

      mockRequest.params = { id: '123' };

      const middleware = validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.validated?.params).toEqual({ id: 123 });
    });

    it('should fail validation with invalid path parameters', () => {
      const schema = {
        params: Joi.object({
          id: Joi.number().integer().positive().required(),
        }),
      };

      mockRequest.params = { id: 'invalid' };

      const middleware = validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('validate() - Multiple validations', () => {
    it('should validate body, query, and params together', () => {
      const schema = {
        body: Joi.object({ name: Joi.string().required() }),
        query: Joi.object({ page: Joi.number().default(1) }),
        params: Joi.object({ id: Joi.number().required() }),
      };

      mockRequest.body = { name: 'John' };
      mockRequest.query = {};
      mockRequest.params = { id: '123' };

      const middleware = validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.validated?.body).toEqual({ name: 'John' });
      expect(mockRequest.validated?.query).toEqual({ page: 1 });
      expect(mockRequest.validated?.params).toEqual({ id: 123 });
    });

    it('should return all validation errors from multiple sources', () => {
      const schema = {
        body: Joi.object({ name: Joi.string().required() }),
        query: Joi.object({ page: Joi.number().min(1).required() }),
      };

      mockRequest.body = {}; // Missing name
      mockRequest.query = {}; // Missing page

      const middleware = validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'name' }),
            expect.objectContaining({ field: 'page' }),
          ]),
        })
      );
    });
  });

  describe('validateBody() shorthand', () => {
    it('should validate body only', () => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
      });

      mockRequest.body = { email: 'test@example.com' };

      const middleware = validateBody(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateQuery() shorthand', () => {
    it('should validate query only', () => {
      const schema = Joi.object({
        q: Joi.string().required(),
      });

      mockRequest.query = { q: 'search term' };

      const middleware = validateQuery(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateParams() shorthand', () => {
    it('should validate params only', () => {
      const schema = Joi.object({
        id: Joi.number().required(),
      });

      mockRequest.params = { id: '456' };

      const middleware = validateParams(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.validated?.params).toEqual({ id: 456 });
    });
  });

  describe('Validation options', () => {
    it('should use abortEarly option', () => {
      const schema = {
        body: Joi.object({
          field1: Joi.string().required(),
          field2: Joi.string().required(),
          field3: Joi.string().required(),
        }),
      };

      mockRequest.body = {}; // All fields missing

      const middleware = validate(schema, { abortEarly: true });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.details.length).toBe(1); // Only first error
    });

    it('should return all errors when abortEarly is false', () => {
      const schema = {
        body: Joi.object({
          field1: Joi.string().required(),
          field2: Joi.string().required(),
          field3: Joi.string().required(),
        }),
      };

      mockRequest.body = {}; // All fields missing

      const middleware = validate(schema, { abortEarly: false });
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      const callArgs = jsonMock.mock.calls[0][0];
      expect(callArgs.details.length).toBe(3); // All errors
    });
  });
});
