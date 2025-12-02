import { Request, Response, NextFunction } from 'express';
import { HookSystem } from '../HookSystem';

export interface ExpressHookPayload {
  method: string;
  path: string;
  body: unknown;
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  headers: Record<string, unknown>;
}

export const expressHookEmitter =
  (hookSystem: HookSystem, eventName: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const payload: ExpressHookPayload = {
      method: req.method,
      path: req.originalUrl,
      body: req.body,
      params: req.params,
      query: req.query,
      headers: req.headers,
    };

    void hookSystem.trigger(eventName, payload);
    next();
  };
