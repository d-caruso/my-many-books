/**
 * TraceId generation and propagation middleware
 *
 * Generates unique trace IDs for each request to enable
 * log correlation across services and adapters.
 */

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Async local storage for trace ID
 *
 * This allows trace ID to be accessed throughout the request lifecycle
 * without explicitly passing it through every function call.
 */
export const traceIdStorage = new AsyncLocalStorage<string>();

/**
 * Generate a unique trace ID
 *
 * @returns 16-character hex string
 */
export function generateTraceId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Get current trace ID from async local storage
 *
 * @returns Current trace ID or undefined if not in request context
 */
export function getCurrentTraceId(): string | undefined {
  return traceIdStorage.getStore();
}

/**
 * Express middleware to generate and inject trace ID
 *
 * - Extracts trace ID from X-Trace-Id header if present
 * - Generates new trace ID if not present
 * - Stores in async local storage for access throughout request
 * - Adds trace ID to response headers
 *
 * @example
 * ```typescript
 * app.use(traceIdMiddleware());
 * ```
 */
export function traceIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract from header or generate new
    const traceId =
      (req.headers['x-trace-id'] as string) ||
      (req.headers['traceid'] as string) ||
      generateTraceId();

    // Store in async local storage
    traceIdStorage.run(traceId, () => {
      // Add to request object for easy access
      (req as any).traceId = traceId;

      // Add to response headers
      res.setHeader('X-Trace-Id', traceId);

      next();
    });
  };
}

/**
 * Get trace ID from request object
 *
 * @param req - Express request
 * @returns Trace ID
 */
export function getTraceIdFromRequest(req: Request): string {
  return (req as any).traceId || getCurrentTraceId() || generateTraceId();
}
