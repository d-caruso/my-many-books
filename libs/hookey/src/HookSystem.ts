import { EventEmitter2 } from 'eventemitter2';
import {
  HookAction,
  HookActionContext,
  HookConfig,
  HookStorage,
} from './types';
import { InMemoryHookStorage } from './storage/InMemoryHookStorage';
import { validateActionConfig, validateEventPattern } from './utils/validation';

export interface HookSystemOptions {
  timeoutMs?: number;
  failureThreshold?: number;
  cooldownMs?: number;
  logger?: Pick<Console, 'warn' | 'error'>;
}

export class HookSystem {
  private emitter: EventEmitter2;
  private storage: HookStorage;
  private hooks: Map<string, { hook: HookConfig; action: HookAction }> = new Map();
  private currentEvent: string | undefined;
  private breakerState: Map<string, { failures: number; openUntil: number | null }> = new Map();
  private readonly timeoutMs: number;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly logger: Pick<Console, 'warn' | 'error'>;

  constructor(storage?: HookStorage, options?: HookSystemOptions) {
    this.storage = storage ?? new InMemoryHookStorage();
    this.emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      maxListeners: 100,
      verboseMemoryLeak: true,
    });
    this.timeoutMs = options?.timeoutMs ?? 30_000;
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.cooldownMs = options?.cooldownMs ?? 60_000;
    this.logger = options?.logger ?? console;
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
    await this.emitter.emitAsync(eventName, payload);
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
    const breaker = this.getBreakerState(hook.id);
    if (breaker.openUntil && breaker.openUntil > Date.now()) {
      this.logger.warn?.(
        `[HookSystem] Circuit breaker open for "${hook.name}" (${hook.id}). Skipping event "${actualEventName}".`
      );
      await this.storage.logExecution({
        hookId: hook.id,
        eventName: actualEventName,
        eventData: payload as Record<string, unknown>,
        success: false,
        errorMessage: `Circuit breaker open until ${new Date(breaker.openUntil).toISOString()}`,
        executedAt: new Date(),
        executionTimeMs: 0,
      });
      return;
    }

    if (breaker.openUntil && breaker.openUntil <= Date.now()) {
      this.resetBreaker(hook.id);
    }

    const context: HookActionContext = { eventName: actualEventName, payload };
    const start = Date.now();
    try {
      const executionPromise = action.execute(context);
      await this.runWithTimeout(hook, executionPromise);
      await this.storage.logExecution({
        hookId: hook.id,
        eventName: actualEventName,
        eventData: payload as Record<string, unknown>,
        success: true,
        executedAt: new Date(),
        executionTimeMs: Date.now() - start,
      });
      this.resetBreaker(hook.id);
    } catch (error: any) {
      this.recordFailure(hook.id);
      await this.storage.logExecution({
        hookId: hook.id,
        eventName: actualEventName,
        eventData: payload as Record<string, unknown>,
        success: false,
        errorMessage: error.message,
        executedAt: new Date(),
        executionTimeMs: Date.now() - start,
      });
      this.logger.error?.(
        `[HookSystem] Failed executing "${hook.name}" (${hook.id}) for event "${actualEventName}": ${error.message}`
      );
      throw error;
    }
  }

  private getBreakerState(hookId: string): { failures: number; openUntil: number | null } {
    if (!this.breakerState.has(hookId)) {
      this.breakerState.set(hookId, { failures: 0, openUntil: null });
    }
    return this.breakerState.get(hookId) as { failures: number; openUntil: number | null };
  }

  private resetBreaker(hookId: string): void {
    this.breakerState.set(hookId, { failures: 0, openUntil: null });
  }

  private recordFailure(hookId: string): void {
    const state = this.getBreakerState(hookId);
    state.failures += 1;
    if (state.failures >= this.failureThreshold) {
      state.openUntil = Date.now() + this.cooldownMs;
      this.logger.warn?.(
        `[HookSystem] Circuit breaker opened for hook "${hookId}" after ${state.failures} failures`
      );
    }
    this.breakerState.set(hookId, state);
  }

  private async runWithTimeout<T>(hook: HookConfig, promise: Promise<T>): Promise<T> {
    if (!this.timeoutMs || this.timeoutMs <= 0) {
      return promise;
    }

    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Hook "${hook.name}" timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
