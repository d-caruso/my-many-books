const pinoHttpMock = jest.fn(() => jest.fn());
const pinoMock = jest.fn(() => ({ mock: 'logger' }));
const createPinoConfigMock = jest.fn(() => ({ level: 'info' }));
const getCurrentTraceIdMock = jest.fn(() => 'trace-123');

jest.mock('pino-http', () => ({ __esModule: true, default: pinoHttpMock }));
jest.mock('pino', () => ({ __esModule: true, default: pinoMock }));
jest.mock('../../../config/pinoConfig', () => ({
  createPinoConfig: createPinoConfigMock,
}));
jest.mock('../../../middleware/traceIdGenerator', () => ({
  getCurrentTraceId: getCurrentTraceIdMock,
}));

import type { Request, Response } from 'express';
import { requestLoggerMiddleware } from '../../../middleware/requestLogger';

describe('requestLoggerMiddleware', () => {
  beforeEach(() => {
    pinoHttpMock.mockClear();
    pinoMock.mockClear();
    createPinoConfigMock.mockClear();
    getCurrentTraceIdMock.mockClear();
  });

  it('uses provided logger and fixed level when options.level is set', () => {
    const customLogger = { info: jest.fn() };

    requestLoggerMiddleware({ logger: customLogger as any, level: 'debug' });

    expect(pinoHttpMock).toHaveBeenCalledTimes(1);
    const options = (pinoHttpMock as any).mock.calls[0][0];

    expect(options.logger).toBe(customLogger);
    expect(options.customLogLevel({}, { statusCode: 500 }, null)).toBe('debug');
  });

  it('creates a default pino logger when no logger is provided', () => {
    requestLoggerMiddleware();

    expect(createPinoConfigMock).toHaveBeenCalledTimes(1);
    expect(pinoMock).toHaveBeenCalledWith(createPinoConfigMock.mock.results[0]?.value);
    expect(pinoHttpMock).toHaveBeenCalledTimes(1);
  });

  it('selects log levels based on response status', () => {
    const customLogger = { info: jest.fn() };
    requestLoggerMiddleware({ logger: customLogger as any });

    const options = (pinoHttpMock as any).mock.calls[0][0];
    expect(options.customLogLevel({} as Request, { statusCode: 200 } as Response, null)).toBe('info');
    expect(options.customLogLevel({} as Request, { statusCode: 302 } as Response, null)).toBe('info');
    expect(options.customLogLevel({} as Request, { statusCode: 404 } as Response, null)).toBe('warn');
    expect(options.customLogLevel({} as Request, { statusCode: 500 } as Response, null)).toBe('error');
  });

  it('adds traceId and custom fields via customProps', () => {
    const customLogger = { info: jest.fn() };
    requestLoggerMiddleware({ logger: customLogger as any, customFields: { foo: 'bar' } });

    const options = (pinoHttpMock as any).mock.calls[0][0];
    expect(options.customProps({} as Request, {} as Response)).toEqual({ traceId: 'trace-123', foo: 'bar' });
  });

  it('adds only traceId when customFields is not provided', () => {
    const customLogger = { info: jest.fn() };
    requestLoggerMiddleware({ logger: customLogger as any });

    const options = (pinoHttpMock as any).mock.calls[0][0];
    expect(options.customProps({} as Request, {} as Response)).toEqual({ traceId: 'trace-123' });
  });

  it('uses shouldLog to control autoLogging.ignore', () => {
    const customLogger = { info: jest.fn() };
    const shouldLog = jest.fn().mockReturnValue(false);

    requestLoggerMiddleware({ logger: customLogger as any, shouldLog });
    const options = (pinoHttpMock as any).mock.calls[0][0];

    expect(options.autoLogging.ignore({ url: '/anything' } as any)).toBe(true);

    shouldLog.mockReturnValue(true);
    expect(options.autoLogging.ignore({ url: '/anything' } as any)).toBe(false);
  });

  it('skips /health by default', () => {
    const customLogger = { info: jest.fn() };
    requestLoggerMiddleware({ logger: customLogger as any });
    const options = (pinoHttpMock as any).mock.calls[0][0];
    expect(options.autoLogging.ignore({ url: '/health' } as any)).toBe(true);
    expect(options.autoLogging.ignore({ url: '/not-health' } as any)).toBe(false);
  });

  it('formats success and error messages', () => {
    const customLogger = { info: jest.fn() };
    requestLoggerMiddleware({ logger: customLogger as any });
    const options = (pinoHttpMock as any).mock.calls[0][0];

    expect(options.customSuccessMessage({ method: 'GET', url: '/x' } as any, { statusCode: 200 } as any)).toBe(
      'GET /x - 200'
    );

    expect(
      options.customErrorMessage(
        { method: 'GET', url: '/x' } as any,
        { statusCode: 500 } as any,
        new Error('boom')
      )
    ).toBe('GET /x - 500 - boom');
  });
});
