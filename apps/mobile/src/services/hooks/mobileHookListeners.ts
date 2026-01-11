// ================================================================
// src/services/hooks/mobileHookListeners.ts
// Mobile hook listeners for analytics, error reporting, and monitoring
// ================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { HookSystem, HookConfig, HookAction, HookActionContext } from '@my-many-books/hookey';
import { mobileHookConfigService } from './mobileHookConfigService';

export interface MobileHookListenerConfig {
  analyticsEnabled: boolean;
  errorReportingEnabled: boolean;
  offlineStorageEnabled: boolean;
  performanceMonitoringEnabled: boolean;
  batchUploadInterval: number; // seconds
  maxOfflineEvents: number;
}

export interface HookEventData {
  eventType: string;
  data: unknown;
  timestamp: string;
  sessionId?: string;
  environment?: string;
}

// Analytics listener for user behavior tracking
class AnalyticsListener {
  private config: MobileHookListenerConfig;

  constructor(config: MobileHookListenerConfig) {
    this.config = config;
  }

  async handleEvent(eventType: string, data: unknown): Promise<void> {
    // 2-Level Priority System Check
    const shouldProcess = await mobileHookConfigService.shouldProcessHooks('analytics');
    if (!shouldProcess) {
      return; // Skip based on priority system
    }

    if (!this.config.analyticsEnabled) {
      return;
    }

    try {
      // For now, we'll use a simple analytics approach
      // In a real implementation, this would integrate with Firebase Analytics
      if (__DEV__) {
        console.log('[Analytics] Event tracked:', {
          eventType,
          timestamp: new Date().toISOString(),
          data,
        });
      }

      // Store analytics events for batch upload
      await this.storeAnalyticsEvent(eventType, data);
    } catch (error) {
      if (__DEV__) {
        console.warn('[Analytics] Failed to track event:', error);
      }
    }
  }

  private async storeAnalyticsEvent(eventType: string, data: unknown): Promise<void> {
    try {
      const analyticsEvent = {
        eventType,
        data: data as Record<string, unknown>,
        timestamp: new Date().toISOString(),
        category: 'user_behavior',
      };

      const existingEvents = await AsyncStorage.getItem('analytics_events');
      const events = existingEvents ? JSON.parse(existingEvents) : [];
      
      events.push(analyticsEvent);
      
      // Keep only the most recent events
      if (events.length > this.config.maxOfflineEvents) {
        events.splice(0, events.length - this.config.maxOfflineEvents);
      }

      await AsyncStorage.setItem('analytics_events', JSON.stringify(events));
    } catch (error) {
      if (__DEV__) {
        console.warn('[Analytics] Failed to store analytics event:', error);
      }
    }
  }
}

// Error reporting listener for crash and error tracking
class ErrorReportingListener {
  private config: MobileHookListenerConfig;

  constructor(config: MobileHookListenerConfig) {
    this.config = config;
  }

  async handleEvent(eventType: string, data: unknown): Promise<void> {
    // 2-Level Priority System Check
    const shouldProcess = await mobileHookConfigService.shouldProcessHooks('error_reporting');
    if (!shouldProcess) {
      return; // Skip based on priority system
    }

    if (!this.config.errorReportingEnabled) {
      return;
    }

    try {
      // Only handle error events
      if (!eventType.includes('error') && !eventType.includes('ERROR')) {
        return;
      }

      if (__DEV__) {
        console.log('[ErrorReporting] Error tracked:', {
          eventType,
          timestamp: new Date().toISOString(),
          data,
        });
      }

      // Store error events for crash reporting
      await this.storeErrorEvent(eventType, data);
    } catch (error) {
      if (__DEV__) {
        console.warn('[ErrorReporting] Failed to track error:', error);
      }
    }
  }

  private async storeErrorEvent(eventType: string, data: unknown): Promise<void> {
    try {
      const errorEvent = {
        eventType,
        data: data as Record<string, unknown>,
        timestamp: new Date().toISOString(),
        category: 'error_reporting',
        severity: this.getErrorSeverity(eventType),
      };

      const existingErrors = await AsyncStorage.getItem('error_events');
      const errors = existingErrors ? JSON.parse(existingErrors) : [];
      
      errors.push(errorEvent);
      
      // Keep only the most recent errors
      if (errors.length > this.config.maxOfflineEvents) {
        errors.splice(0, errors.length - this.config.maxOfflineEvents);
      }

      await AsyncStorage.setItem('error_events', JSON.stringify(errors));
    } catch (error) {
      if (__DEV__) {
        console.warn('[ErrorReporting] Failed to store error event:', error);
      }
    }
  }

  private getErrorSeverity(eventType: string): string {
    const upperEventType = eventType.toUpperCase();
    if (upperEventType.includes('UNHANDLED') || upperEventType.includes('PROMISE_REJECTION')) {
      return 'critical';
    }
    if (upperEventType.includes('NETWORK') || upperEventType.includes('TIMEOUT')) {
      return 'high';
    }
    if (upperEventType.includes('VALIDATION') || upperEventType.includes('USER_FACING')) {
      return 'medium';
    }
    return 'low';
  }
}

// Offline storage listener for event queuing
class OfflineStorageListener {
  private config: MobileHookListenerConfig;

  constructor(config: MobileHookListenerConfig) {
    this.config = config;
  }

  async handleEvent(eventType: string, data: unknown): Promise<void> {
    // 2-Level Priority System Check
    const shouldProcess = await mobileHookConfigService.shouldProcessHooks('offline_storage');
    if (!shouldProcess) {
      return; // Skip based on priority system
    }

    if (!this.config.offlineStorageEnabled) {
      return;
    }

    try {
      // Store all events for offline processing
      await this.storeOfflineEvent(eventType, data);
    } catch (error) {
      if (__DEV__) {
        console.warn('[OfflineStorage] Failed to store offline event:', error);
      }
    }
  }

  private async storeOfflineEvent(eventType: string, data: unknown): Promise<void> {
    try {
      const offlineEvent: HookEventData = {
        eventType,
        data,
        timestamp: new Date().toISOString(),
        sessionId: this.generateSessionId(),
        environment: 'mobile',
      };

      const existingEvents = await AsyncStorage.getItem('offline_events');
      const events = existingEvents ? JSON.parse(existingEvents) : [];
      
      events.push(offlineEvent);
      
      // Keep only the most recent events
      if (events.length > this.config.maxOfflineEvents) {
        events.splice(0, events.length - this.config.maxOfflineEvents);
      }

      await AsyncStorage.setItem('offline_events', JSON.stringify(events));
    } catch (error) {
      if (__DEV__) {
        console.warn('[OfflineStorage] Failed to store offline event:', error);
      }
    }
  }

  private generateSessionId(): string {
    return `mobile-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Performance monitoring listener for app metrics
class PerformanceMonitoringListener {
  private config: MobileHookListenerConfig;
  private performanceStartTimes: Map<string, number> = new Map();

  constructor(config: MobileHookListenerConfig) {
    this.config = config;
  }

  async handleEvent(eventType: string, data: unknown): Promise<void> {
    // 2-Level Priority System Check
    const shouldProcess = await mobileHookConfigService.shouldProcessHooks('performance_monitoring');
    if (!shouldProcess) {
      return; // Skip based on priority system
    }

    if (!this.config.performanceMonitoringEnabled) {
      return;
    }

    try {
      // Track performance metrics for operations
      if (eventType.includes('.START')) {
        this.trackOperationStart(eventType);
      } else if (eventType.includes('.SUCCESS') || eventType.includes('.COMPLETE')) {
        await this.trackOperationComplete(eventType, data);
      } else if (eventType.includes('PERFORMANCE_METRIC')) {
        await this.trackPerformanceMetric(eventType, data);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[PerformanceMonitoring] Failed to track performance:', error);
      }
    }
  }

  private trackOperationStart(eventType: string): void {
    const operationKey = eventType.replace('.START', '');
    this.performanceStartTimes.set(operationKey, Date.now());
  }

  private async trackOperationComplete(eventType: string, data: unknown): Promise<void> {
    const operationKey = eventType.replace('.SUCCESS', '').replace('.COMPLETE', '');
    const startTime = this.performanceStartTimes.get(operationKey);
    
    if (startTime) {
      const duration = Date.now() - startTime;
      this.performanceStartTimes.delete(operationKey);

      const dataAsRecord = data && typeof data === 'object' ? data as Record<string, unknown> : {};

      const performanceEvent = {
        eventType: `${operationKey}.PERFORMANCE_METRIC`,
        data: {
          ...dataAsRecord,
          duration,
          operationType: operationKey,
          timestamp: new Date().toISOString(),
        },
        category: 'performance_monitoring',
      };

      if (__DEV__) {
        console.log('[PerformanceMonitoring] Operation completed:', performanceEvent);
      }

      await this.storePerformanceEvent(performanceEvent);
    }
  }

  private async trackPerformanceMetric(eventType: string, data: unknown): Promise<void> {
    const performanceEvent = {
      eventType,
      data,
      timestamp: new Date().toISOString(),
      category: 'performance_monitoring',
    };

    if (__DEV__) {
      console.log('[PerformanceMonitoring] Performance metric tracked:', performanceEvent);
    }

    await this.storePerformanceEvent(performanceEvent);
  }

  private async storePerformanceEvent(performanceEvent: unknown): Promise<void> {
    try {
      const existingMetrics = await AsyncStorage.getItem('performance_metrics');
      const metrics = existingMetrics ? JSON.parse(existingMetrics) : [];
      
      metrics.push(performanceEvent);
      
      // Keep only the most recent metrics
      if (metrics.length > this.config.maxOfflineEvents) {
        metrics.splice(0, metrics.length - this.config.maxOfflineEvents);
      }

      await AsyncStorage.setItem('performance_metrics', JSON.stringify(metrics));
    } catch (error) {
      if (__DEV__) {
        console.warn('[PerformanceMonitoring] Failed to store performance event:', error);
      }
    }
  }
}

// Main mobile hook listeners manager
export class MobileHookListenersManager {
  private config: MobileHookListenerConfig;
  private analyticsListener: AnalyticsListener;
  private errorReportingListener: ErrorReportingListener;
  private offlineStorageListener: OfflineStorageListener;
  private performanceMonitoringListener: PerformanceMonitoringListener;
  private hookSystem: HookSystem | null = null;

  constructor(config: Partial<MobileHookListenerConfig> = {}) {
    this.config = {
      analyticsEnabled: config.analyticsEnabled ?? true,
      errorReportingEnabled: config.errorReportingEnabled ?? true,
      offlineStorageEnabled: config.offlineStorageEnabled ?? true,
      performanceMonitoringEnabled: config.performanceMonitoringEnabled ?? true,
      batchUploadInterval: config.batchUploadInterval ?? 300, // 5 minutes
      maxOfflineEvents: config.maxOfflineEvents ?? 1000,
    };

    this.analyticsListener = new AnalyticsListener(this.config);
    this.errorReportingListener = new ErrorReportingListener(this.config);
    this.offlineStorageListener = new OfflineStorageListener(this.config);
    this.performanceMonitoringListener = new PerformanceMonitoringListener(this.config);
  }

  async registerListeners(hookSystem: HookSystem): Promise<void> {
    this.hookSystem = hookSystem;

    try {
      // Register analytics listener for user behavior events
      if (this.config.analyticsEnabled) {
        const analyticsHookConfig: Omit<HookConfig, 'id' | 'createdAt' | 'updatedAt'> = {
          name: 'Mobile Analytics Listener',
          description: 'Tracks user behavior and app usage analytics',
          eventPattern: '*',
          actionType: 'analytics',
          isActive: true,
          priority: 1,
        };

        const analyticsAction: HookAction = {
          execute: async (context: HookActionContext) => {
            await this.analyticsListener.handleEvent(context.eventName, context.payload);
          },
        };

        // Use a proper hook config with ID for registration
        const analyticsHookWithId: HookConfig = {
          ...analyticsHookConfig,
          id: 'mobile-analytics-listener',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await hookSystem.registerExistingHook(analyticsHookWithId, analyticsAction);
      }

      // Register error reporting listener for error events
      if (this.config.errorReportingEnabled) {
        const errorReportingHookConfig: Omit<HookConfig, 'id' | 'createdAt' | 'updatedAt'> = {
          name: 'Mobile Error Reporting Listener',
          description: 'Tracks and reports errors and crashes',
          eventPattern: '*',
          actionType: 'error_reporting',
          isActive: true,
          priority: 1,
        };

        const errorReportingAction: HookAction = {
          execute: async (context: HookActionContext) => {
            await this.errorReportingListener.handleEvent(context.eventName, context.payload);
          },
        };

        const errorReportingHookWithId: HookConfig = {
          ...errorReportingHookConfig,
          id: 'mobile-error-reporting-listener',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await hookSystem.registerExistingHook(errorReportingHookWithId, errorReportingAction);
      }

      // Register offline storage listener for all events
      if (this.config.offlineStorageEnabled) {
        const offlineStorageHookConfig: Omit<HookConfig, 'id' | 'createdAt' | 'updatedAt'> = {
          name: 'Mobile Offline Storage Listener',
          description: 'Stores events for offline processing',
          eventPattern: '*',
          actionType: 'offline_storage',
          isActive: true,
          priority: 1,
        };

        const offlineStorageAction: HookAction = {
          execute: async (context: HookActionContext) => {
            await this.offlineStorageListener.handleEvent(context.eventName, context.payload);
          },
        };

        const offlineStorageHookWithId: HookConfig = {
          ...offlineStorageHookConfig,
          id: 'mobile-offline-storage-listener',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await hookSystem.registerExistingHook(offlineStorageHookWithId, offlineStorageAction);
      }

      // Register performance monitoring listener for performance events
      if (this.config.performanceMonitoringEnabled) {
        const performanceMonitoringHookConfig: Omit<HookConfig, 'id' | 'createdAt' | 'updatedAt'> = {
          name: 'Mobile Performance Monitoring Listener',
          description: 'Tracks app performance metrics and timing',
          eventPattern: '*',
          actionType: 'performance_monitoring',
          isActive: true,
          priority: 1,
        };

        const performanceMonitoringAction: HookAction = {
          execute: async (context: HookActionContext) => {
            await this.performanceMonitoringListener.handleEvent(context.eventName, context.payload);
          },
        };

        const performanceMonitoringHookWithId: HookConfig = {
          ...performanceMonitoringHookConfig,
          id: 'mobile-performance-monitoring-listener',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await hookSystem.registerExistingHook(performanceMonitoringHookWithId, performanceMonitoringAction);
      }

      if (__DEV__) {
        console.log('[MobileHookListeners] All listeners registered successfully');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[MobileHookListeners] Failed to register listeners:', error);
      }
      throw error;
    }
  }

  updateConfig(newConfig: Partial<MobileHookListenerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): MobileHookListenerConfig {
    return { ...this.config };
  }

  async getStoredEvents(category: 'analytics' | 'error' | 'offline' | 'performance'): Promise<HookEventData[]> {
    try {
      const storageKey = `${category}_events`;
      const storedData = await AsyncStorage.getItem(storageKey);
      return storedData ? JSON.parse(storedData) : [];
    } catch (error) {
      if (__DEV__) {
        console.warn(`[MobileHookListeners] Failed to get stored ${category} events:`, error);
      }
      return [];
    }
  }

  async clearStoredEvents(category: 'analytics' | 'error' | 'offline' | 'performance'): Promise<void> {
    try {
      const storageKey = `${category}_events`;
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      if (__DEV__) {
        console.warn(`[MobileHookListeners] Failed to clear stored ${category} events:`, error);
      }
    }
  }
}

// Export singleton instance
export const mobileHookListenersManager = new MobileHookListenersManager();