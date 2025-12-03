import { EventEmitter2 } from "eventemitter2";
import {
  HookAction,
  HookActionContext,
  HookConfig,
  HookStorage,
} from "./types";
import { InMemoryHookStorage } from "./storage/InMemoryHookStorage";
import { validateActionConfig, validateEventPattern } from "./utils/validation";

export class HookSystem {
  private emitter: EventEmitter2;
  private storage: HookStorage;
  private hooks: Map<string, { hook: HookConfig; action: HookAction }> =
    new Map();
  private currentEvent: string | undefined;

  constructor(storage?: HookStorage) {
    this.storage = storage ?? new InMemoryHookStorage();
    this.emitter = new EventEmitter2({
      wildcard: true,
      delimiter: ".",
      maxListeners: 100,
      verboseMemoryLeak: true,
    });
  }

  async registerHook(hook: HookConfig, action: HookAction): Promise<void> {
    // Validate event pattern for ReDoS and malicious patterns
    validateEventPattern(hook.eventPattern);

    // Validate action configuration based on action type
    if (hook.actionConfig) {
      validateActionConfig(hook.actionType, hook.actionConfig);
    }

    await this.storage.createHook({
      name: hook.name,
      ...(hook.description !== undefined && { description: hook.description }),
      ...(hook.actionConfig !== undefined && {
        actionConfig: hook.actionConfig,
      }),
      actionType: hook.actionType,
      eventPattern: hook.eventPattern,
      isActive: hook.isActive,
      priority: hook.priority,
    });

    // Store hook and action for reference
    this.hooks.set(hook.id, { hook, action });

    // Register listener for the pattern
    const listener = async (payload?: unknown) => {
      // Use the current event name being triggered (set in trigger method)
      const actualEventName = this.currentEvent || hook.eventPattern;
      await this.executeAction(hook, action, actualEventName, payload);
    };

    this.emitter.on(hook.eventPattern, listener);
  }

  async trigger(eventName: string, payload?: unknown): Promise<void> {
    // Track the current event being triggered for wildcard pattern matching
    this.currentEvent = eventName;
    this.emitter.emit(eventName, payload);
    this.currentEvent = undefined;
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
