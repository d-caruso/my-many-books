// ================================================================
// src/services/hooks/hookSystem.ts
// Centralized HookSystem initialization and lifecycle management
// ================================================================

import { ActionRouter, HookSystem, HookStorage } from '@my-many-books/hookey';
import { DatabaseHookStorage } from './DatabaseHookStorage';
import { hookConfig } from '../../config';
import { getLogger } from '../logger';

const isTestRuntime = (): boolean => {
  return process.env['NODE_ENV'] === 'test' || Boolean(process.env['JEST_WORKER_ID']);
};

export interface HookSystemManagerOptions {
  isTestEnvironment?: boolean;
  isEnabled?: boolean;
  hookSystemFactory?: () => HookSystem;
}

export class HookSystemManager {
  private hookSystem: HookSystem | null = null;
  private initializationPromise: Promise<HookSystem> | null = null;

  private readonly createHookSystem: () => HookSystem;
  private readonly options: HookSystemManagerOptions;

  constructor(
    private readonly storage: HookStorage = new DatabaseHookStorage(),
    private readonly router: ActionRouter = new ActionRouter(),
    options: HookSystemManagerOptions = {}
  ) {
    const inferredTestEnv =
      options.isTestEnvironment !== undefined ? options.isTestEnvironment : isTestRuntime();
    const inferredEnabled =
      options.isEnabled !== undefined ? options.isEnabled : hookConfig.enabled;
    this.options = {
      isTestEnvironment: inferredTestEnv,
      isEnabled: inferredEnabled,
    };
    this.createHookSystem =
      options.hookSystemFactory ?? ((): HookSystem => new HookSystem(this.storage));
  }

  async initialize(): Promise<HookSystem | null> {
    if (this.shouldSkipHooks()) {
      return null;
    }

    if (this.hookSystem) {
      return this.hookSystem;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = this.createSystem();
    }

    try {
      return await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  async reload(): Promise<void> {
    if (this.shouldSkipHooks()) {
      return;
    }

    const system = this.createHookSystem();
    await this.registerActiveHooks(system);
    this.hookSystem = system;
  }

  getInstance(): HookSystem {
    if (!this.hookSystem) {
      throw new Error('HookSystem has not been initialized');
    }
    return this.hookSystem;
  }

  isOperational(): boolean {
    return Boolean(this.hookSystem) && !this.shouldSkipHooks();
  }

  private async createSystem(): Promise<HookSystem> {
    try {
      const system = this.createHookSystem();
      await this.registerActiveHooks(system);
      this.hookSystem = system;
      return system;
    } catch (error) {
      getLogger().error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
        },
        'HookSystem initialization failed'
      );
      throw error;
    }
  }

  private async registerActiveHooks(system: HookSystem): Promise<void> {
    const hooks = await this.storage.getHooks({ isActive: true });
    for (const hook of hooks) {
      try {
        const action = this.router.createAction(hook.actionType, hook.actionConfig);
        await system.registerExistingHook(hook, action);
      } catch (error) {
        getLogger().error(
          {
            err: error instanceof Error ? error : new Error(String(error)),
            hookName: hook.name,
            eventPattern: hook.eventPattern,
            actionType: hook.actionType,
          },
          'Failed to register hook'
        );
        throw error;
      }
    }
  }

  private shouldSkipHooks(): boolean {
    return Boolean(this.options.isTestEnvironment) || this.options.isEnabled === false;
  }
}

const hookSystemManager = new HookSystemManager();

export const initializeHookSystem = (): Promise<HookSystem | null> => {
  return hookSystemManager.initialize();
};

export const reloadHookSystem = (): Promise<void> => {
  return hookSystemManager.reload();
};

export const getHookSystem = (): HookSystem => {
  return hookSystemManager.getInstance();
};

export const emitHookEvent = async (eventName: string, payload?: unknown): Promise<void> => {
  if (isTestRuntime() || hookConfig.enabled === false) {
    return;
  }

  try {
    const system = getHookSystem();
    await system.trigger(eventName, payload);
  } catch (error) {
    getLogger().warn(
      {
        err: error instanceof Error ? error : new Error(String(error)),
        eventName,
      },
      'Skipped hook event'
    );
  }
};
