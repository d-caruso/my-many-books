import { controlPlaneHookService } from '../../../../src/services/hooks/ControlPlaneHookService';
import { emitHookEvent } from '../../../../src/services/hooks/hookSystem';

jest.mock('../../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

describe('ControlPlaneHookService', () => {
  const emitHookEventMock = emitHookEvent as jest.MockedFunction<typeof emitHookEvent>;

  beforeEach(() => {
    emitHookEventMock.mockClear();
  });

  it('emits the selected lifecycle phase from a branch', async () => {
    await controlPlaneHookService.emitLifecycleEvent(
      {
        BEFORE: 'config.settings.update.before',
        AFTER: 'config.settings.update.after',
        FAILURE: 'config.settings.update.failure',
      },
      'AFTER',
      { key: 'audit_logging_enabled' }
    );

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
