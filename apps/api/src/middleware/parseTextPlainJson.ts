import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to parse text/plain content containing JSON for mobile analytics endpoints
 */
export const parseTextPlainJson = (req: Request, res: Response, next: NextFunction): void => {
  void res; // Acknowledge parameter for TypeScript compliance
  
  if (req.get('Content-Type') === 'text/plain' && req.body && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      // Keep original body if not valid JSON
    }
  }
  next();
};