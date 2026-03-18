jest.mock('../../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

const { controlPlaneHookService } = require('../../../../src/services/hooks/ControlPlaneHookService.ts');
const { emitHookEvent } = require('../../../../src/services/hooks/hookSystem');

describe('ControlPlaneHookService', () => {
  const emitHookEventMock = emitHookEvent as jest.MockedFunction<
    typeof import('../../../../src/services/hooks/hookSystem').emitHookEvent
  >;

  beforeEach(() => {
    emitHookEventMock.mockClear();
  });

  it('emits the selected lifecycle phase from a branch without awaiting hook execution', () => {
    emitHookEventMock.mockImplementation(() => new Promise(() => {}));

    const result = controlPlaneHookService.emitLifecycleEvent(
      {
        BEFORE: 'config.settings.update.before',
        AFTER: 'config.settings.update.after',
        FAILURE: 'config.settings.update.failure',
      },
      'AFTER',
      { key: 'audit_logging_enabled' }
    );

    expect(result).toBeUndefined();
    expect(emitHookEventMock).toHaveBeenCalledWith('config.settings.update.after', {
      key: 'audit_logging_enabled',
    });
  });

  it('maps request actor context when a user is present', () => {
    expect(controlPlaneHookService.getActorContext({ id: 7, role: 'admin' })).toEqual({
      id: 7,
      role: 'admin',
    });
    expect(controlPlaneHookService.getActorContext(null)).toBeNull();
  });
});
