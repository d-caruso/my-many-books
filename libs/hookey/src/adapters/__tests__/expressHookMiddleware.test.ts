import { Request, Response, NextFunction } from 'express';
import { HookSystem } from '../../HookSystem';
import { expressHookEmitter, ExpressHookPayload } from '../expressHookMiddleware';

const API_PREFIX = '/api';
const API_VERSION = 'v1';
const requestPath = `${API_PREFIX}/${API_VERSION}/users`;

class DummyHookSystem extends HookSystem {
  public lastPayload: ExpressHookPayload | null = null;
  override async trigger(_eventName: string, payload?: unknown): Promise<void> {
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
      originalUrl: requestPath,
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
      path: requestPath,
      body: { name: 'D' },
      params: { id: '123' },
      query: { verbose: 'true' },
      headers: { authorization: 'Bearer token' },
    });
    expect(next).toHaveBeenCalled();
  });
});
