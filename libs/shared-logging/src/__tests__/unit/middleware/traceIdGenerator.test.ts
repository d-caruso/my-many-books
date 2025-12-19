import type { Request, Response, NextFunction } from 'express';
import {
  generateTraceId,
  getCurrentTraceId,
  getTraceIdFromRequest,
  traceIdMiddleware,
  traceIdStorage,
} from '../../../middleware/traceIdGenerator';

describe('traceIdGenerator', () => {
  it('generateTraceId returns a 16-character hex string', () => {
    const traceId = generateTraceId();
    expect(traceId).toMatch(/^[0-9a-f]{16}$/);
  });

  it('traceIdMiddleware uses X-Trace-Id header and sets request + response', () => {
    const req = { headers: { 'x-trace-id': 'trace-123' } } as unknown as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;

    const next: NextFunction = jest.fn(() => {
      expect(getCurrentTraceId()).toBe('trace-123');
      expect((req as any).traceId).toBe('trace-123');
    });

    traceIdMiddleware()(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Trace-Id', 'trace-123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('traceIdMiddleware falls back to traceid header', () => {
    const req = { headers: { traceid: 'trace-abc' } } as unknown as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;

    traceIdMiddleware()(req, res, next);

    expect((req as any).traceId).toBe('trace-abc');
    expect(res.setHeader).toHaveBeenCalledWith('X-Trace-Id', 'trace-abc');
  });

  it('traceIdMiddleware generates a traceId if none is present', () => {
    const req = { headers: {} } as unknown as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;

    traceIdMiddleware()(req, res, next);

    const traceId = (req as any).traceId as string;
    expect(traceId).toMatch(/^[0-9a-f]{16}$/);
    expect(res.setHeader).toHaveBeenCalledWith('X-Trace-Id', traceId);
  });

  it('getTraceIdFromRequest prefers request.traceId', () => {
    const req = { traceId: 'from-req' } as unknown as Request;
    expect(getTraceIdFromRequest(req)).toBe('from-req');
  });

  it('getTraceIdFromRequest falls back to async local storage', () => {
    const req = { headers: {} } as unknown as Request;
    traceIdStorage.run('from-als', () => {
      expect(getTraceIdFromRequest(req)).toBe('from-als');
    });
  });

  it('getTraceIdFromRequest generates a traceId when none is present', () => {
    const req = { headers: {} } as unknown as Request;
    expect(getTraceIdFromRequest(req)).toMatch(/^[0-9a-f]{16}$/);
  });
});
