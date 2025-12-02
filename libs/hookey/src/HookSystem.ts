import { EventEmitter } from 'events';
import {
  HookAction,
  HookActionContext,
  HookConfig,
  HookExecution,
  HookStorage,
} from './types';
import { InMemoryHookStorage } from './storage/InMemoryHookStorage';

export class HookSystem {
  private emitter = new EventEmitter();
  private storage: HookStorage;

  constructor(storage?: HookStorage) {
    this.storage = storage ?? new InMemoryHookStorage();
  }

  async registerHook(hook: HookConfig, action: HookAction): Promise<void> {
    await this.storage.createHook({
      name: hook.name,
      description: hook.description,
      actionConfig: hook.actionConfig,
      actionType: hook.actionType,
      eventPattern: hook.eventPattern,
      isActive: hook.isActive,
      priority: hook.priority,
    });
    this.emitter.on(hook.eventPattern, async payload => {
      await this.executeAction(hook, action, payload);
    });
  }

  async trigger(eventName: string, payload?: unknown): Promise<void> {
    this.emitter.emit(eventName, payload);
  }

  private async executeAction(hook: HookConfig, action: HookAction, payload?: unknown): Promise<void> {
    const context: HookActionContext = { eventName: hook.eventPattern, payload };
    const start = Date.now();
    try {
      await action.execute(context);
      await this.storage.logExecution({
        hookId: hook.id,
        eventName: hook.eventPattern,
        eventData: payload as Record<string, unknown>,
        success: true,
        executedAt: new Date(),
        executionTimeMs: Date.now() - start,
      });
    } catch (error: any) {
      await this.storage.logExecution({
        hookId: hook.id,
        eventName: hook.eventPattern,
        eventData: payload as Record<string, unknown>,
        success: false,
        errorMessage: error.message,
        executedAt: new Date(),
        executionTimeMs: Date.now() - start,
      });
      throw error;
    }
  }
}
