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
import type { Logger } from 'pino';
import { requestLoggerMiddleware } from '../../../middleware/requestLogger';

interface RequestLoggerOptionsUnderTest {
  logger: Logger;
  customLogLevel: (req: Request, res: Response, err: Error | null) => string;
  customProps: (req: Request, res: Response) => Record<string, unknown>;
  autoLogging: { ignore: (req: Request) => boolean };
  customSuccessMessage: (req: Request, res: Response) => string;
  customErrorMessage: (req: Request, res: Response, error: Error) => string;
}

const createLogger = (): Logger => ({ info: jest.fn() }) as unknown as Logger;

const createMockRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    method: 'GET',
    url: '/anything',
    ...overrides,
  }) as unknown as Request;

const createMockResponse = (statusCode: number): Response =>
  ({ statusCode }) as unknown as Response;

const getPinoHttpOptions = (): RequestLoggerOptionsUnderTest => {
  const calls = pinoHttpMock.mock.calls as unknown[][];
  const firstCall = calls[0];
  if (!firstCall || firstCall.length === 0) {
    throw new Error('Expected pino-http to be called at least once');
  }
  return firstCall[0] as RequestLoggerOptionsUnderTest;
};

describe('requestLoggerMiddleware', () => {
  beforeEach(() => {
    pinoHttpMock.mockClear();
    pinoMock.mockClear();
    createPinoConfigMock.mockClear();
    getCurrentTraceIdMock.mockClear();
  });

  it('uses provided logger and fixed level when options.level is set', () => {
    const customLogger = createLogger();

    requestLoggerMiddleware({ logger: customLogger, level: 'debug' });

    expect(pinoHttpMock).toHaveBeenCalledTimes(1);
    const options = getPinoHttpOptions();

    expect(options.logger).toBe(customLogger);
    expect(options.customLogLevel(createMockRequest(), createMockResponse(500), null)).toBe('debug');
  });

  it('creates a default pino logger when no logger is provided', () => {
    requestLoggerMiddleware();

    expect(createPinoConfigMock).toHaveBeenCalledTimes(1);
    expect(pinoMock).toHaveBeenCalledWith(createPinoConfigMock.mock.results[0]?.value);
    expect(pinoHttpMock).toHaveBeenCalledTimes(1);
  });

  it('selects log levels based on response status', () => {
    const customLogger = createLogger();
    requestLoggerMiddleware({ logger: customLogger });

    const options = getPinoHttpOptions();
    expect(options.customLogLevel(createMockRequest(), createMockResponse(200), null)).toBe('info');
    expect(options.customLogLevel(createMockRequest(), createMockResponse(302), null)).toBe('info');
    expect(options.customLogLevel(createMockRequest(), createMockResponse(404), null)).toBe('warn');
    expect(options.customLogLevel(createMockRequest(), createMockResponse(500), null)).toBe('error');
  });

  it('adds traceId and custom fields via customProps', () => {
    const customLogger = createLogger();
    requestLoggerMiddleware({ logger: customLogger, customFields: { foo: 'bar' } });

    const options = getPinoHttpOptions();
    expect(options.customProps(createMockRequest(), createMockResponse(200))).toEqual({
      traceId: 'trace-123',
      foo: 'bar',
    });
  });

  it('adds only traceId when customFields is not provided', () => {
    const customLogger = createLogger();
    requestLoggerMiddleware({ logger: customLogger });

    const options = getPinoHttpOptions();
    expect(options.customProps(createMockRequest(), createMockResponse(200))).toEqual({ traceId: 'trace-123' });
  });

  it('uses shouldLog to control autoLogging.ignore', () => {
    const customLogger = createLogger();
    const shouldLog = jest.fn().mockReturnValue(false);

    requestLoggerMiddleware({ logger: customLogger, shouldLog });
    const options = getPinoHttpOptions();

    expect(options.autoLogging.ignore(createMockRequest())).toBe(true);

    shouldLog.mockReturnValue(true);
    expect(options.autoLogging.ignore(createMockRequest())).toBe(false);
  });

  it('skips /health by default', () => {
    const customLogger = createLogger();
    requestLoggerMiddleware({ logger: customLogger });
    const options = getPinoHttpOptions();
    expect(options.autoLogging.ignore(createMockRequest({ url: '/health' }))).toBe(true);
    expect(options.autoLogging.ignore(createMockRequest({ url: '/not-health' }))).toBe(false);
  });

  it('formats success and error messages', () => {
    const customLogger = createLogger();
    requestLoggerMiddleware({ logger: customLogger });
    const options = getPinoHttpOptions();

    expect(options.customSuccessMessage(createMockRequest({ method: 'GET', url: '/x' }), createMockResponse(200))).toBe(
      'GET /x - 200'
    );

    expect(
      options.customErrorMessage(
        createMockRequest({ method: 'GET', url: '/x' }),
        createMockResponse(500),
        new Error('boom')
      )
    ).toBe('GET /x - 500 - boom');
  });
});
