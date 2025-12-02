import { Request, Response, NextFunction } from 'express';
import { HookSystem } from '../../HookSystem';
import { expressHookEmitter, ExpressHookPayload } from '../expressHookMiddleware';

class DummyHookSystem extends HookSystem {
  public lastPayload: ExpressHookPayload | null = null;
  override async trigger(eventName: string, payload?: unknown): Promise<void> {
    this.lastPayload = payload as ExpressHookPayload;
    await Promise.resolve();
  }
}

describe('expressHookEmitter', () => {
  it('passes request metadata to HookSystem', () => {
    const hookSystem = new DummyHookSystem();
    const middleware = expressHookEmitter(hookSystem, 'user.created');

    const request = {
      method: 'POST',
      originalUrl: '/api/v1/users',
      body: { name: 'D' },
      params: { id: '123' },
      query: { verbose: 'true' },
      headers: { authorization: 'Bearer token' },
    } as unknown as Request;

    const response = {} as Response;
    const next = jest.fn() as NextFunction;

    middleware(request, response, next);

    expect(hookSystem.lastPayload).toEqual({
      method: 'POST',
      path: '/api/v1/users',
      body: { name: 'D' },
      params: { id: '123' },
      query: { verbose: 'true' },
      headers: { authorization: 'Bearer token' },
    });
    expect(next).toHaveBeenCalled();
  });
});
