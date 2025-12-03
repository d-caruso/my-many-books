import { EventEmitter2 } from 'eventemitter2';
import {
  HookAction,
  HookActionContext,
  HookConfig,
  HookStorage,
} from './types';
import { InMemoryHookStorage } from './storage/InMemoryHookStorage';
import { validateActionConfig, validateEventPattern } from './utils/validation';

export class HookSystem {
  private emitter: EventEmitter2;
  private storage: HookStorage;
  private hooks: Map<string, { hook: HookConfig; action: HookAction }> = new Map();
  private currentEvent: string | undefined;

  constructor(storage?: HookStorage) {
    this.storage = storage ?? new InMemoryHookStorage();
    this.emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      maxListeners: 100,
      verboseMemoryLeak: true,
    });
  }

  async registerHook(hook: HookConfig, action: HookAction): Promise<void> {
    this.validateHookConfig(hook);
    await this.storage.createHook(this.mapHookForPersistence(hook));
    await this.registerHookInternal(hook, action);
  }

  async registerExistingHook(hook: HookConfig, action: HookAction): Promise<void> {
    this.validateHookConfig(hook);
    await this.registerHookInternal(hook, action);
  }

  async trigger(eventName: string, payload?: unknown): Promise<void> {
    // Track the current event being triggered for wildcard pattern matching
    this.currentEvent = eventName;
    this.emitter.emit(eventName, payload);
    this.currentEvent = undefined;
  }

  private async registerHookInternal(hook: HookConfig, action: HookAction): Promise<void> {
    const normalizedHook = this.normalizeHook(hook);
    // Store hook and action for reference
    this.hooks.set(normalizedHook.id, { hook: normalizedHook, action });

    // Register listener for the pattern
    const listener = async (payload?: unknown): Promise<void> => {
      // Use the current event name being triggered (set in trigger method)
      const actualEventName = this.currentEvent || normalizedHook.eventPattern;
      await this.executeAction(normalizedHook, action, actualEventName, payload);
    };

    this.emitter.on(normalizedHook.eventPattern, listener);
  }

  private validateHookConfig(hook: HookConfig): void {
    validateEventPattern(hook.eventPattern);
    if (hook.actionConfig) {
      validateActionConfig(hook.actionType, hook.actionConfig);
    }
  }

  private mapHookForPersistence(
    hook: HookConfig,
  ): Omit<HookConfig, 'id' | 'createdAt' | 'updatedAt'> {
    const { name, description, actionConfig, actionType, eventPattern, isActive, priority } = hook;
    return {
      name,
      ...(description !== undefined && { description }),
      ...(actionConfig !== undefined && { actionConfig }),
      actionType,
      eventPattern,
      isActive,
      priority,
    };
  }

  private normalizeHook(hook: HookConfig): HookConfig {
    const hookId = typeof hook.id === 'string' ? hook.id : String(hook.id);
    return { ...hook, id: hookId };
  }

  private async executeAction(
    hook: HookConfig,
    action: HookAction,
    actualEventName: string,
    payload?: unknown,
  ): Promise<void> {
    const context: HookActionContext = { eventName: actualEventName, payload };
    const start = Date.now();
    try {
      await action.execute(context);
      await this.storage.logExecution({
        hookId: hook.id,
        eventName: actualEventName,
        eventData: payload as Record<string, unknown>,
        success: true,
        executedAt: new Date(),
        executionTimeMs: Date.now() - start,
      });
    } catch (error: any) {
      await this.storage.logExecution({
        hookId: hook.id,
        eventName: actualEventName,
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
