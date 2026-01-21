// ================================================================
// src/services/hooks/index.ts
// Main entry point for mobile hook system with listener initialization
// ================================================================

import { mobileHooks } from './mobileHooks';
import { mobileHookListenersManager } from './mobileHookListeners';

let listenersInitialized = false;

/**
 * Initialize mobile hook listeners
 * This function should be called during app startup
 */
export const initializeMobileHookListeners = async (): Promise<void> => {
  if (listenersInitialized) {
    return;
  }

  try {
    const hookSystem = mobileHooks.getInstance();
    
    if (hookSystem) {
      await mobileHookListenersManager.registerListeners(hookSystem);
      listenersInitialized = true;
      
      if (__DEV__) {
        console.log('[MobileHooks] Hook system initialized with listeners');
      }
    } else {
      if (__DEV__) {
        console.warn('[MobileHooks] Hook system not available for listener registration');
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[MobileHooks] Failed to initialize listeners:', error);
    }
    // Don't throw - app should continue without listeners
  }
};

/**
 * Check if listeners are initialized
 */
export const areListenersInitialized = (): boolean => {
  return listenersInitialized;
};

// Export everything for easy access
export { mobileHooks } from './mobileHooks';
export { mobileHookListenersManager } from './mobileHookListeners';
export { MOBILE_EVENTS, RESOURCE_TYPES, OPERATION_STATUSES } from './eventsSchema';
export type { EventsTree } from './eventsSchema';
export type { MobileHooksListenerSettings, HookEventData } from './mobileHookListeners';