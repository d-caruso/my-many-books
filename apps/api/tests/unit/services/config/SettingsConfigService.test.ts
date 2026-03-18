import { settingsService } from '../../../../src/services/config/SettingsService';
import { Setting } from '../../../../src/models';
import { emitHookEvent } from '../../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../../src/services/hooks/events';

const mockInvalidateCache = jest.fn();

jest.mock('../../../../src/models', () => ({
  Setting: {
    findOne: jest.fn(),
    upsert: jest.fn(),
  },
}));

jest.mock('../../../../src/services/AuditLogService', () => ({
  getAuditLogService: () => ({
    invalidateCache: mockInvalidateCache,
  }),
}));

jest.mock('../../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

describe('settingsService', () => {
  const forceDisabled = process.env['AUDIT_LOGGING_FORCE_DISABLED'];
  const forceEnabled = process.env['AUDIT_LOGGING_FORCE_ENABLED'];

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env['AUDIT_LOGGING_FORCE_DISABLED'];
    delete process.env['AUDIT_LOGGING_FORCE_ENABLED'];
  });

  afterAll(() => {
    process.env['AUDIT_LOGGING_FORCE_DISABLED'] = forceDisabled;
    process.env['AUDIT_LOGGING_FORCE_ENABLED'] = forceEnabled;
  });

  it('updates audit logging in the service layer and emits lifecycle hooks', async () => {
    await settingsService.updateAuditLoggingStatus(true, {
      user: { id: 9, role: 'admin' },
    } as any);

    expect(Setting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'audit_logging_enabled',
        value: 'true',
      })
    );
    expect(mockInvalidateCache).toHaveBeenCalled();
    expect(emitHookEvent).toHaveBeenNthCalledWith(
      1,
      EVENTS.CONFIG.AUDIT_LOGGING.UPDATE.BEFORE,
      expect.objectContaining({
        actor: { id: 9, role: 'admin' },
        enabled: true,
      })
    );
    expect(emitHookEvent).toHaveBeenNthCalledWith(
      2,
      EVENTS.CONFIG.AUDIT_LOGGING.UPDATE.AFTER,
      expect.objectContaining({
        actor: { id: 9, role: 'admin' },
        enabled: true,
      })
    );
  });

  it('rejects audit logging changes when config forces the value', async () => {
    process.env['AUDIT_LOGGING_FORCE_DISABLED'] = 'true';

    await expect(
      settingsService.updateAuditLoggingStatus(false, { user: { id: 1 } } as any)
    ).rejects.toThrow('SETTING_ENFORCED_BY_CONFIG');
  });
});
