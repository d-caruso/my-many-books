import { hookRegistryService } from '../../../../src/services/hooks/HookRegistryService';
import { createModel } from '../../../../src/utils/sequelize-helpers';
import { emitHookEvent } from '../../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../../src/services/hooks/events';

const mockLogActionFromRequest = jest.fn();

jest.mock('../../../../src/models', () => ({
  Hook: {},
  HookExecution: {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  },
}));

jest.mock('../../../../src/utils/sequelize-helpers', () => ({
  createModel: jest.fn(),
}));

jest.mock('../../../../src/services/AuditLogService', () => ({
  getAuditLogService: () => ({
    logActionFromRequest: mockLogActionFromRequest,
  }),
}));

jest.mock('../../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
  reloadHookSystem: jest.fn().mockResolvedValue(undefined),
}));

describe('HookRegistryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits create lifecycle events from the service layer', async () => {
    const createdHook = {
      id: 11,
      name: 'Critical errors',
      eventPattern: 'error.*',
      actionType: 'email',
      get: jest.fn().mockReturnValue({
        id: 11,
        name: 'Critical errors',
        eventPattern: 'error.*',
      }),
    };

    (createModel as jest.Mock).mockResolvedValue(createdHook);

    const input = {
      name: 'Critical errors',
      description: 'Alert on critical errors',
      eventPattern: 'error.*',
      actionType: 'email',
      actionConfig: { recipients: ['ops@example.com'] },
      isActive: true,
      priority: 10,
      createdBy: 7,
    } as const;

    await hookRegistryService.createHook(input as any, {
      user: { id: 7, role: 'admin' },
    } as any);

    expect(emitHookEvent).toHaveBeenNthCalledWith(
      1,
      EVENTS.HOOK.CREATE.BEFORE,
      expect.objectContaining({
        actor: { id: 7, role: 'admin' },
        input,
      })
    );
    expect(emitHookEvent).toHaveBeenNthCalledWith(
      2,
      EVENTS.HOOK.CREATE.AFTER,
      expect.objectContaining({
        actor: { id: 7, role: 'admin' },
        hook: { id: 11, name: 'Critical errors', eventPattern: 'error.*' },
      })
    );
    expect(mockLogActionFromRequest).toHaveBeenCalledWith(
      expect.anything(),
      'create',
      'hook',
      '11',
      expect.objectContaining({
        name: 'Critical errors',
        eventPattern: 'error.*',
        actionType: 'email',
      })
    );
  });
});
