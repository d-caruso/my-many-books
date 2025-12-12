// ================================================================
// tests/unit/middleware/expressErrorHandler.test.ts
// ================================================================

import { Request, Response } from 'express';
import { BadRequestError, InternalServerError } from '../../../src/errors/ApplicationError';
import { expressErrorHandler } from '../../../src/middleware/expressErrorHandler';
import { getLogger } from '../../../src/services/logger';

jest.mock('../../../src/services/logger', () => {
  const actual = jest.requireActual('../../../src/services/logger');
  return {
    ...actual,
    getLogger: jest.fn(),
  };
});

describe('expressErrorHandler', () => {
  const buildRes = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const noopReq = {} as Request;
  const next = jest.fn();
  let mockLogger: { error: jest.Mock };
  const originalNodeEnv = process.env['NODE_ENV'];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = {
      error: jest.fn(),
    };
    (getLogger as jest.Mock).mockReturnValue(mockLogger);
    process.env['NODE_ENV'] = 'test';
  });

  afterEach(() => {
    process.env['NODE_ENV'] = originalNodeEnv;
  });

  it('serializes ApplicationError instances', () => {
    const error = new BadRequestError('Invalid data', { field: 'title' }, 'VALIDATION_ERROR');
    const res = buildRes();

    expressErrorHandler(error, noopReq, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Invalid data',
        code: 'VALIDATION_ERROR',
        details: { field: 'title' },
      })
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        err: error,
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        isOperational: true,
      }),
      'Unhandled application error'
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('wraps non-ApplicationError instances and hides stack in production', () => {
    process.env['NODE_ENV'] = 'production';
    const error = new Error('Boom');
    const res = buildRes();

    expressErrorHandler(error, noopReq, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      })
    );
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.stack).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it('includes stack traces in non-production environments', () => {
    const error = new InternalServerError('Unexpected failure');
    const res = buildRes();

    expressErrorHandler(error, noopReq, res, next);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.stack).toEqual(expect.any(String));
  });

  it('maps JSON parse errors to bad request responses', () => {
    const syntaxError = new SyntaxError('Unexpected token') as SyntaxError & { status?: number };
    syntaxError.status = 400;
    const res = buildRes();

    expressErrorHandler(syntaxError, noopReq, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Invalid JSON payload',
        code: 'INVALID_JSON',
      })
    );
  });
});
