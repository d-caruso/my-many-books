import { adminMobileHooksActionsConfigController, ACTION_TYPES } from '../../../src/controllers/admin/AdminMobileHooksActionsConfigController';
import { AppSetting } from '../../../src/models';
import { webhookService } from '../../../src/services/action-tests/WebhookService';
import DatabaseConnection from '../../../src/config/database';
import { BASE_HOOKS, GLOBAL_SCOPE, HOOK_KEY_PATTERNS } from '@my-many-books/shared-types';

jest.mock('@my-many-books/shared-i18n', () => ({
  initializeI18n: jest.fn(),
  i18n: {
    t: jest.fn((key: string) => key),
    changeLanguage: jest.fn(),
    language: 'en',
    isInitialized: true,
  },
}));

jest.mock('../../../src/services/AuditLogService', () => ({
  getAuditLogService: () => ({
    logActionFromRequest: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../../src/services/action-tests/WebhookService', () => ({
  webhookService: {
    executeTestEndpoints: jest.fn().mockResolvedValue([
      { endpoint: 'https://hooks.example.com/1', success: true, status: 200 },
    ]),
  },
}));

jest.mock('../../../src/models', () => ({
  AppSetting: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
  },
}));

describe('AdminMobileHooksActionsConfigController - webhook tests', () => {
  const mockedWebhook = webhookService as jest.Mocked<typeof webhookService>;

  beforeEach(() => {
    const mockSequelize = ({
      sync: jest.fn(),
      authenticate: jest.fn().mockResolvedValue(true),
      close: jest.fn(),
    } as unknown) as import('sequelize').Sequelize;
    DatabaseConnection.setConnectionFactory(() => mockSequelize);

    jest.clearAllMocks();
  });

  afterAll(() => {
    DatabaseConnection.resetConnectionFactory();
  });

  it('executes webhook endpoints when dryRun is false', async () => {
    (AppSetting.findAll as jest.Mock).mockResolvedValue([
      {
        key: `${HOOK_KEY_PATTERNS.ACTIONS_BASE}.settings.webhook`,
        value: JSON.stringify({
          enabled: true,
          endpoints: ['https://hooks.example.com/test'],
          rate_limit_minutes: 1,
          timeout_seconds: 5,
          retry_attempts: 2,
          expected_fields: ['webhook'],
        }),
      },
    ]);

    const mockRequest = {
      body: {
        actionType: ACTION_TYPES.WEBHOOK,
        dryRun: false,
      },
      user: { id: 'admin', role: 'admin' },
    } as any;

    const result = await adminMobileHooksActionsConfigController.testActionType(mockRequest);
    const responseData = result.data as {
      execution?: { details?: { results?: unknown[] } };
    };

    expect(result.success).toBe(true);
    expect(mockedWebhook.executeTestEndpoints).toHaveBeenCalledWith(
      ['https://hooks.example.com/test'],
      expect.any(Object)
    );
    expect(responseData.execution?.details?.results).toHaveLength(1);
  });

  it('does not execute webhook endpoints when dryRun is true', async () => {
    (AppSetting.findAll as jest.Mock).mockResolvedValue([
      {
        key: `${HOOK_KEY_PATTERNS.ACTIONS_BASE}.settings.webhook`,
        value: JSON.stringify({
          enabled: true,
          endpoints: ['https://hooks.example.com/test'],
        }),
      },
    ]);

    const mockRequest = {
      body: {
        actionType: ACTION_TYPES.WEBHOOK,
        dryRun: true,
      },
      user: { id: 'admin', role: 'admin' },
    } as any;

    const result = await adminMobileHooksActionsConfigController.testActionType(mockRequest);
    const responseData = result.data as {
      execution?: { details?: { results?: unknown[] } };
    };

    expect(result.success).toBe(true);
    expect(mockedWebhook.executeTestEndpoints).not.toHaveBeenCalled();
    expect(responseData.execution?.details?.results).toBeUndefined();
  });
});
