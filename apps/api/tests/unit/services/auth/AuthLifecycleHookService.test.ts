import { authLifecycleHookService } from '../../../../src/services/auth/AuthLifecycleHookService';
import { EVENTS } from '../../../../src/services/hooks/events';
import { emitHookEvent } from '../../../../src/services/hooks/hookSystem';

jest.mock('../../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

const emitHookEventMock = jest.mocked(emitHookEvent);

describe('AuthLifecycleHookService', () => {
  beforeEach(() => {
    emitHookEventMock.mockClear();
  });

  it('emits user login lifecycle events without awaiting hook execution', () => {
    emitHookEventMock.mockImplementation(() => new Promise(() => {}));

    const result = authLifecycleHookService.emitUserLoginBefore({ email: 'user@example.com' });

    expect(result).toBeUndefined();
    expect(emitHookEventMock).toHaveBeenCalledWith(EVENTS.USER.LOGIN.BEFORE, {
      email: 'user@example.com',
    });
  });

  it('emits auth login failure through the shared hook emitter', () => {
    authLifecycleHookService.emitAuthLoginFailure({
      email: 'user@example.com',
      error: 'Invalid credentials',
    });

    expect(emitHookEventMock).toHaveBeenCalledWith(EVENTS.AUTH.LOGIN.FAILURE, {
      email: 'user@example.com',
      error: 'Invalid credentials',
    });
  });
});
