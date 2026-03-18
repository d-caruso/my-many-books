import type {
  HookAction,
  HookConfig,
  HookExecution,
  HookStorage,
  HookStorageStats,
  HookSystem,
} from '@my-many-books/hookey';
import * as hookService from '../../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../../src/services/hooks/events';
import { getLogger } from '@my-many-books/shared-logging';

jest.mock('@my-many-books/shared-logging', () => ({
  getLogger: jest.fn(),
}));

const { HookSystemManager } = hookService;

describe('HookSystem service', () => {
  const originalEnv = process.env['NODE_ENV'];
  let mockLogger: { info: jest.Mock; warn: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env['NODE_ENV'] = 'development';
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (getLogger as jest.Mock).mockReturnValue(mockLogger);
  });

  afterEach(() => {
    process.env['NODE_ENV'] = originalEnv;
  });

  const mockHooks: HookConfig[] = [
    {
      id: '1',
      name: 'audit',
      description: 'Audit log',
      eventPattern: '**',
      actionType: 'log',
      actionConfig: { prefix: 'audit' },
      isActive: true,
      priority: 10,
    },
    {
      id: '2',
      name: 'book created notifier',
      eventPattern: EVENTS.BOOK.CREATE.AFTER,
      actionType: 'log',
      actionConfig: { prefix: 'book' },
      isActive: true,
      priority: 5,
    },
  ];

  class TestHookStorage implements HookStorage {
    constructor(private hooks: HookConfig[]) {}

    setHooks(nextHooks: HookConfig[]): void {
      this.hooks = nextHooks;
    }

    async getHooks(): Promise<HookConfig[]> {
      return this.hooks;
    }

    async getHook(): Promise<HookConfig | null> {
      return null;
    }

    async createHook(): Promise<HookConfig> {
      throw new Error('Not implemented');
    }

    async updateHook(): Promise<HookConfig> {
      throw new Error('Not implemented');
    }

    async deleteHook(): Promise<void> {
      throw new Error('Not implemented');
    }

    async logExecution(): Promise<void> {
      // no-op for tests
    }

    async getExecutions(): Promise<HookExecution[]> {
      return [];
    }

    async getRecentExecutions(): Promise<HookExecution[]> {
      return [];
    }

    async getStats(): Promise<HookStorageStats> {
      return {
        totalHooks: this.hooks.length,
        activeHooks: this.hooks.length,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
      };
    }
  }

  class TestActionRouter {
    createAction(): HookAction {
      return {
        execute: jest.fn(),
      };
    }
  }

  const createHookSystemMock = (): HookSystem => {
    return {
      registerExistingHook: jest.fn().mockResolvedValue(undefined),
      trigger: jest.fn().mockResolvedValue(undefined),
    } as unknown as HookSystem;
  };

  it('initializes and registers all active hooks', async () => {
    const storage = new TestHookStorage(mockHooks);
    const router = new TestActionRouter();
    const hookSystemMock = createHookSystemMock();
    const manager = new HookSystemManager(storage, router as any, {
      isTestEnvironment: false,
      hookSystemFactory: () => hookSystemMock,
    });

    let system: unknown;
    try {
      system = await manager.initialize();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('initializeHookSystem failed', error);
      throw error;
    }

    expect(system).toBeDefined();
    expect(hookSystemMock.registerExistingHook).toHaveBeenCalledTimes(mockHooks.length);
    expect(() => manager.getInstance()).not.toThrow();
  });

  it('throws when getHookSystem is invoked before initialization', async () => {
    const storage = new TestHookStorage(mockHooks);
    const router = new TestActionRouter();
    const manager = new HookSystemManager(storage, router as any, { isTestEnvironment: false });

    expect(() => manager.getInstance()).toThrow('HookSystem has not been initialized');
  });

  it('reloads hooks using the latest database snapshot', async () => {
    const storage = new TestHookStorage(mockHooks);
    const router = new TestActionRouter();
    const firstSystem = createHookSystemMock();
    const secondSystem = createHookSystemMock();
    const hookSystemFactory = jest
      .fn<HookSystem, []>()
      .mockReturnValueOnce(firstSystem)
      .mockReturnValueOnce(secondSystem);
    const manager = new HookSystemManager(storage, router as any, {
      isTestEnvironment: false,
      hookSystemFactory,
    });

    try {
      await manager.initialize();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('initialization failed', error);
      throw error;
    }
    expect(firstSystem.registerExistingHook).toHaveBeenCalledTimes(mockHooks.length);

    try {
      storage.setHooks([mockHooks[0]!]);
      await manager.reload();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('reload failed', error);
      throw error;
    }

    expect(secondSystem.registerExistingHook).toHaveBeenCalledTimes(1);
  });
  describe('emitHookEvent', () => {
    it('does nothing when running inside test runtime', async () => {
      process.env['NODE_ENV'] = 'test';
      await expect(hookService.emitHookEvent(EVENTS.BOOK.CREATE.BEFORE)).resolves.toBeUndefined();
    });

    it('logs a warning when hook system is unavailable', async () => {
      process.env['NODE_ENV'] = 'development';
      const originalWorkerId = process.env['JEST_WORKER_ID'];
      delete process.env['JEST_WORKER_ID'];
      const getHookSystemSpy = jest
        .spyOn(hookService, 'getHookSystem')
        .mockImplementation(() => {
          throw new Error('HookSystem has not been initialized');
        });

      await expect(hookService.emitHookEvent(EVENTS.BOOK.CREATE.FAILURE)).resolves.toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          err: expect.any(Error),
          eventName: EVENTS.BOOK.CREATE.FAILURE,
        },
        'Skipped hook event'
      );

      getHookSystemSpy.mockRestore();
      if (originalWorkerId) {
        process.env['JEST_WORKER_ID'] = originalWorkerId;
      }
    });
  });
});
