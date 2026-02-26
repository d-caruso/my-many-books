// ================================================================
// src/services/hooks/mobileHooks.ts
// Mobile HookSystem initialization and event management
// ================================================================

import { HookSystem, InMemoryHookStorage } from '@my-many-books/hookey';
import { mobileHookConfigService } from './mobileHookConfigService';

const isTestRuntime = (): boolean => {
  return __DEV__ || Boolean(process.env.JEST_WORKER_ID);
};

export interface MobileHookSystemOptions {
  environment?: string;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  logLevel?: string;
  isTestEnvironment?: boolean;
  isEnabled?: boolean;
}

export class MobileHookSystemManager {
  private hookSystem: HookSystem | null = null;
  private readonly options: MobileHookSystemOptions;

  constructor(options: MobileHookSystemOptions = {}) {
    const inferredTestEnv = options.isTestEnvironment !== undefined 
      ? options.isTestEnvironment 
      : isTestRuntime();
    
    const inferredEnabled = options.isEnabled !== undefined 
      ? options.isEnabled 
      : true; // Enable by default for mobile

    this.options = {
      environment: options.environment || 'mobile',
      enableLogging: options.enableLogging !== undefined ? options.enableLogging : true,
      enableMetrics: options.enableMetrics !== undefined ? options.enableMetrics : true,
      logLevel: options.logLevel || (__DEV__ ? 'debug' : 'info'),
      isTestEnvironment: inferredTestEnv,
      isEnabled: inferredEnabled,
    };
  }

  initialize(): HookSystem | null {
    if (this.shouldSkipHooks()) {
      return null;
    }

    if (this.hookSystem) {
      return this.hookSystem;
    }

    try {
      // Use in-memory storage for mobile (no database persistence needed)
      const storage = new InMemoryHookStorage();
      this.hookSystem = new HookSystem(storage);
      
      if (this.options.enableLogging && __DEV__) {
        console.log('[MobileHooks] Hook system initialized successfully');
      }
      
      return this.hookSystem;
    } catch (error) {
      if (this.options.enableLogging) {
        console.error('[MobileHooks] Hook system initialization failed:', error);
      }
      return null;
    }
  }

  async emit(eventName: string, payload?: unknown): Promise<void> {
    // Level 1: Check test environment and local config
    if (this.shouldSkipHooks()) {
      return;
    }

    // Level 2 & 3: Check 2-Level Priority System (Environment + Database + Individual Controls)
    const shouldProcess = await mobileHookConfigService.shouldProcessHooks(eventName);
    if (!shouldProcess) {
      return; // Skip based on priority system
    }

    const system = this.getInstance();
    if (!system) {
      return;
    }

    try {
      await system.trigger(eventName, {
        ...payload,
        environment: this.options.environment,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
      });
    } catch (error) {
      if (this.options.enableLogging) {
        console.warn('[MobileHooks] Event emission failed:', {
          eventName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      // Don't throw - hook failures should not break app functionality
    }
  }

  getInstance(): HookSystem | null {
    return this.hookSystem;
  }

  isOperational(): boolean {
    return Boolean(this.hookSystem) && !this.shouldSkipHooks();
  }

  private shouldSkipHooks(): boolean {
    return Boolean(this.options.isTestEnvironment) || this.options.isEnabled === false;
  }

  private getSessionId(): string {
    // Simple session ID for mobile - could be enhanced with proper session management
    return `mobile-session-${Date.now()}`;
  }
}

// Create singleton instance
const mobileHookSystemManager = new MobileHookSystemManager();

// Initialize the system - listeners will be registered separately
mobileHookSystemManager.initialize();

// Export singleton methods
export const mobileHooks = {
  emit: (eventName: string, payload?: unknown) => mobileHookSystemManager.emit(eventName, payload),
  getInstance: () => mobileHookSystemManager.getInstance(),
  isOperational: () => mobileHookSystemManager.isOperational(),
};

// Export events for easy access  
export { MOBILE_EVENTS, RESOURCE_TYPES, OPERATION_STATUS } from './eventsSchema';

// Export types
export type { EventsTree } from './eventsSchema';