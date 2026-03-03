import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to parse text/plain content containing JSON for mobile analytics endpoints
 */
export const parseTextPlainJson = (req: Request, res: Response, next: NextFunction): void => {
  void res; // Acknowledge parameter for TypeScript compliance

  if (req.get('Content-Type') === 'text/plain' && req.body && typeof req.body === 'string') {
    try {
      const parsedBody: unknown = JSON.parse(req.body);
      if (parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)) {
        req.body = parsedBody;
      }
    } catch {
      // Keep original body if not valid JSON
    }
  }
  next();
};
