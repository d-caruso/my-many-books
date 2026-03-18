import { AppSetting } from '../../../../src/models';
import { mobileHooksConfigService } from '../../../../src/services/config/MobileHooksConfigService';
import { emitHookEvent } from '../../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../../src/services/hooks/events';

const mockLogActionFromRequest = jest.fn();

jest.mock('../../../../src/models', () => ({
  AppSetting: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
  },
}));

jest.mock('../../../../src/services/AuditLogService', () => ({
  getAuditLogService: () => ({
    logActionFromRequest: mockLogActionFromRequest,
  }),
}));

jest.mock('../../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

describe('mobileHooksConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates listener settings through the service layer and emits lifecycle hooks', async () => {
    const updatedSetting = {
      value: 'true',
      update: jest.fn().mockResolvedValue(undefined),
    };

    (AppSetting.findAll as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          key: 'mobile.hooks.global.analytics.enabled',
          value: 'false',
        },
      ]);
    (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([updatedSetting]);

    const result = await mobileHooksConfigService.updateListenerSettings(
      { analyticsEnabled: false },
      {
        user: { id: 5, role: 'admin' },
      } as any
    );

    expect(result.updated).toEqual(['analyticsEnabled']);
    expect(mockLogActionFromRequest).toHaveBeenCalledWith(
      expect.anything(),
      'update',
      'mobile_config',
      'mobile_hook_listeners',
      expect.objectContaining({
        changes: [{ key: 'analyticsEnabled', value: 'false' }],
      })
    );
    expect(emitHookEvent).toHaveBeenNthCalledWith(
      1,
      EVENTS.CONFIG.MOBILE.HOOKS.SETTINGS.UPDATE.BEFORE,
      expect.objectContaining({
        actor: { id: 5, role: 'admin' },
        changes: { analyticsEnabled: false },
      })
    );
    expect(emitHookEvent).toHaveBeenNthCalledWith(
      2,
      EVENTS.CONFIG.MOBILE.HOOKS.SETTINGS.UPDATE.AFTER,
      expect.objectContaining({
        actor: { id: 5, role: 'admin' },
        updated: ['analyticsEnabled'],
      })
    );
  });
});
