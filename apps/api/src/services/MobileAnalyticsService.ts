// ================================================================
// src/services/MobileAnalyticsService.ts
// Mobile analytics data processing service
// ================================================================

import { MobileAnalyticsEvent } from '../models/MobileAnalyticsEvent';
import { Op } from 'sequelize';
import { getLogger } from '@my-many-books/shared-logging';
import { AppSetting, MobileHookActionExecution } from '../models';
import {
  MobileAnalyticsStats,
  MOBILE_HOOK_SETTING_KEYS,
  HEALTH_STATUS,
  MobileAnalyticsEventTypeBreakdown,
} from '@my-many-books/shared-types';

export interface MobileEventData {
  eventId: string;
  eventType: string;
  userId?: string;
  timestamp: string;
  data: Record<string, unknown>;
  appVersion?: string;
  deviceInfo?: Record<string, unknown>;
}

export class MobileAnalyticsService {
  /**
   * Store a single mobile analytics event
   */
  async storeEvent(eventData: MobileEventData): Promise<MobileAnalyticsEvent> {
    try {
      const event = await MobileAnalyticsEvent.create({
        eventId: eventData.eventId,
        eventType: eventData.eventType,
        userId: eventData.userId,
        timestamp: new Date(eventData.timestamp),
        data: eventData.data,
        appVersion: eventData.appVersion,
        deviceInfo: eventData.deviceInfo,
        processingStatus: 'pending'
      });

      // Process event asynchronously
      this.processEventAsync(event.id).catch(error => {
        getLogger().error({ 
          err: error instanceof Error ? error : new Error(String(error)),
          eventId: event.id 
        }, 'Async event processing failed');
      });

      return event;
    } catch (error) {
      throw new Error(`Failed to store event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store multiple mobile analytics events in batch
   */
  async storeBatchEvents(events: MobileEventData[]): Promise<{
    successful: MobileAnalyticsEvent[];
    failed: Array<{ index: number; error: string }>;
  }> {
    const successful: MobileAnalyticsEvent[] = [];
    const failed: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event) {
        failed.push({
          index: i,
          error: 'Event is null or undefined'
        });
        continue;
      }

      try {
        const stored = await this.storeEvent(event);
        successful.push(stored);
      } catch (error) {
        failed.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Get analytics statistics
   */
  async getAnalyticsStats(): Promise<MobileAnalyticsStats> {
    try {
      const now = new Date();

      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const bucketEnd = new Date(now);
      bucketEnd.setMinutes(0, 0, 0);

      const bucketStart = new Date(bucketEnd);
      bucketStart.setHours(bucketStart.getHours() - 23);
      
      type RecentEventRow = {
        eventType: string;
        processingStatus: 'processed' | 'failed';
        creationDate: Date;
        updateDate: Date;
      };

      const [
        eventsToday,
        processedEventsTotal,
        failedEventsTotal,
        topEventTypes,
        lastProcessed,
        recentEvents,
      ] = await Promise.all([
        // Events processed today
        MobileAnalyticsEvent.count({
          where: {
            processingStatus: 'processed',
            creationDate: { [Op.gte]: startOfToday }
          }
        }),
        
        // Total events processed
        MobileAnalyticsEvent.count({
          where: { processingStatus: 'processed' }
        }),
        
        // Failed events for error rate
        MobileAnalyticsEvent.count({
          where: { processingStatus: 'failed' }
        }),
        
        // Top event types
        this.getTopEventTypes(),
        
        // Last processed event
        MobileAnalyticsEvent.findOne({
          where: { processingStatus: 'processed' },
          order: [['updateDate', 'DESC']],
          attributes: ['updateDate']
        }),

        // Recent events for time series + action-type breakdown
        MobileAnalyticsEvent.findAll({
          where: {
            creationDate: { [Op.gte]: bucketStart },
            processingStatus: { [Op.in]: ['processed', 'failed'] },
          },
          attributes: ['eventType', 'processingStatus', 'creationDate', 'updateDate'],
          raw: true,
        }) as unknown as Promise<RecentEventRow[]>,
      ]);

      const totalEvents = processedEventsTotal + failedEventsTotal;
      const errorRate = totalEvents > 0 ? (failedEventsTotal / totalEvents) : 0;

      // Determine system status
      let systemStatus: MobileAnalyticsStats['systemStatus'] = HEALTH_STATUS.HEALTHY;
      if (errorRate > 0.1) systemStatus = HEALTH_STATUS.DEGRADED;
      if (errorRate > 0.3) systemStatus = HEALTH_STATUS.ERROR;

      const timeSeries = this.buildTimeSeries(bucketStart, bucketEnd, recentEvents);
      const eventTypeBreakdown = this.buildEventTypeBreakdown(recentEvents);

      const avgProcessingTimeMs = this.calculateAvgProcessingTimeFromEvents(recentEvents);

      return {
        eventsProcessedToday: eventsToday,
        eventsProcessedTotal: processedEventsTotal,
        failedEventsTotal,
        errorRate: Math.round(errorRate * 100) / 100,
        avgProcessingTimeMs,
        topEventTypes,
        eventTypeBreakdown,
        lastProcessed: lastProcessed?.updateDate?.toISOString() || null,
        systemStatus,
        timeSeries,
        generatedAt: now.toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get analytics stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get top event types by count
   */
  private async getTopEventTypes(): Promise<Array<{ eventType: string; count: number }>> {
    try {
      const results = await MobileAnalyticsEvent.findAll({
        attributes: [
          'eventType',
          [MobileAnalyticsEvent.sequelize!.fn('COUNT', '*'), 'count']
        ],
        where: { processingStatus: 'processed' },
        group: ['eventType'],
        order: [[MobileAnalyticsEvent.sequelize!.literal('count'), 'DESC']],
        limit: 10,
        raw: true
      });

      const typedResults = results as unknown as Array<{ eventType: string; count: string }>;

      return typedResults.map(result => ({
        eventType: result.eventType,
        count: parseInt(result.count, 10)
      }));
    } catch (error) {
      getLogger().error({ 
        err: error instanceof Error ? error : new Error(String(error))
      }, 'Failed to get top event types');
      return [];
    }
  }

  private buildTimeSeries(
    start: Date,
    end: Date,
    events: Array<{
      eventType: string;
      processingStatus: 'processed' | 'failed';
      creationDate: Date;
      updateDate: Date;
    }>
  ): Array<{ bucketStart: string; processed: number; failed: number; total: number }> {
    const bucketMap = new Map<
      string,
      { bucketStart: string; processed: number; failed: number; total: number }
    >();

    const cursor = new Date(start);
    cursor.setMinutes(0, 0, 0);
    while (cursor.getTime() <= end.getTime()) {
      const key = cursor.toISOString();
      bucketMap.set(key, { bucketStart: key, processed: 0, failed: 0, total: 0 });
      cursor.setHours(cursor.getHours() + 1);
    }

    for (const event of events) {
      const bucket = new Date(event.creationDate);
      bucket.setMinutes(0, 0, 0);
      const key = bucket.toISOString();
      const entry = bucketMap.get(key);
      if (!entry) continue;

      if (event.processingStatus === 'processed') entry.processed += 1;
      if (event.processingStatus === 'failed') entry.failed += 1;
      entry.total += 1;
    }

    return Array.from(bucketMap.values()).sort((a, b) => a.bucketStart.localeCompare(b.bucketStart));
  }

  private calculateAvgProcessingTimeFromEvents(
    events: Array<{
      processingStatus: 'processed' | 'failed';
      creationDate: Date;
      updateDate: Date;
    }>
  ): number {
    const processed = events.filter(e => e.processingStatus === 'processed');
    if (!processed.length) return 0;

    const totalMs = processed.reduce((sum, e) => {
      const start = new Date(e.creationDate).getTime();
      const end = new Date(e.updateDate).getTime();
      return sum + Math.max(0, end - start);
    }, 0);

    return Math.round(totalMs / processed.length);
  }

  private buildEventTypeBreakdown(
    events: Array<{
      eventType: string;
      processingStatus: 'processed' | 'failed';
    }>
  ): MobileAnalyticsEventTypeBreakdown[] {
    const stats = new Map<string, { attempted: number; successful: number; failed: number }>();

    for (const event of events) {
      const eventType = event.eventType;
      if (!eventType) continue;

      const entry = stats.get(eventType) ?? { attempted: 0, successful: 0, failed: 0 };
      entry.attempted += 1;
      if (event.processingStatus === 'processed') entry.successful += 1;
      if (event.processingStatus === 'failed') entry.failed += 1;
      stats.set(eventType, entry);
    }

    return Array.from(stats.entries())
      .map(([eventType, entry]) => {
        const errorRate = entry.attempted ? entry.failed / entry.attempted : 0;
        const successRate = entry.attempted ? entry.successful / entry.attempted : 0;
        return {
          eventType,
          attempted: entry.attempted,
          successful: entry.successful,
          failed: entry.failed,
          successRate: Math.round(successRate * 100) / 100,
          errorRate: Math.round(errorRate * 100) / 100,
        };
      })
      .sort((a, b) => a.eventType.localeCompare(b.eventType));
  }

  private async loadActionMappings(): Promise<Record<string, string[]>> {
    try {
      const record = await AppSetting.findOne({
        where: { key: MOBILE_HOOK_SETTING_KEYS.ACTIONS_MAPPINGS },
      });

      if (!record?.value) return {};

      const parsed: unknown = JSON.parse(record.value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

      const mappings: Record<string, string[]> = {};
      for (const [eventType, actionTypes] of Object.entries(parsed as Record<string, unknown>)) {
        if (!Array.isArray(actionTypes)) continue;
        mappings[eventType] = actionTypes.filter((v): v is string => typeof v === 'string' && v.length > 0);
      }
      return mappings;
    } catch (error) {
      getLogger().error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to load action mappings'
      );
      return {};
    }
  }

  /**
   * Process event asynchronously (placeholder for real processing logic)
   */
  private async processEventAsync(eventId: number): Promise<void> {
    try {
      const event = await MobileAnalyticsEvent.findByPk(eventId);
      if (!event) return;

      const [actionMappings, listenerEnabled, emergency] = await Promise.all([
        this.loadActionMappings(),
        this.isListenerEnabled(event.eventType),
        this.loadEmergencyStatus(),
      ]);

      const actionTypes = actionMappings[event.eventType] || [];
      const actionEnabledMap = await this.loadActionEnabledMap(actionTypes);

      const executedAt = new Date();
      const executions = actionTypes.map(actionType => {
        const actionEnabled = actionEnabledMap[actionType] ?? this.defaultActionEnabled(actionType);

        const blockedByEmergency = emergency.enabled;
        const blockedByListener = !listenerEnabled;

        if (blockedByEmergency) {
          return {
            mobileAnalyticsEventId: event.id,
            actionType,
            status: 'skipped' as const,
            errorMessage: emergency.reason ? `Emergency enabled: ${emergency.reason}` : 'Emergency enabled',
            executedAt,
          };
        }

        if (blockedByListener) {
          return {
            mobileAnalyticsEventId: event.id,
            actionType,
            status: 'skipped' as const,
            errorMessage: `Listener disabled for eventType: ${event.eventType}`,
            executedAt,
          };
        }

        if (!actionEnabled) {
          return {
            mobileAnalyticsEventId: event.id,
            actionType,
            status: 'skipped' as const,
            errorMessage: `Action disabled: ${actionType}`,
            executedAt,
          };
        }

        return {
          mobileAnalyticsEventId: event.id,
          actionType,
          status: 'success' as const,
          executedAt,
        };
      });

      if (executions.length) {
        await MobileHookActionExecution.bulkCreate(executions, { validate: true });
      }

      await event.update({ processingStatus: 'processed', processingError: null });
    } catch (error) {
      // Mark as failed with error
      await MobileAnalyticsEvent.update(
        { 
          processingStatus: 'failed',
          processingError: error instanceof Error ? error.message : 'Unknown processing error'
        },
        { where: { id: eventId } }
      );
    }
  }

  private parseBooleanSetting(value: unknown, defaultValue: boolean): boolean {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      return defaultValue;
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return defaultValue;
  }

  private defaultActionEnabled(actionType: string): boolean {
    // Keep database enabled by default so we persist analytics even if settings are missing.
    if (actionType === 'database') return true;
    return false;
  }

  private async isListenerEnabled(eventType: string): Promise<boolean> {
    const key = `mobile.hooks.listeners.${eventType}.enabled`;
    const setting = await AppSetting.findOne({ where: { key } });
    return setting ? this.parseBooleanSetting(setting.value, true) : true;
  }

  private async loadEmergencyStatus(): Promise<{ enabled: boolean; reason: string | null }> {
    const [enabledSetting, reasonSetting] = await Promise.all([
      AppSetting.findOne({ where: { key: MOBILE_HOOK_SETTING_KEYS.EMERGENCY_ENABLED } }),
      AppSetting.findOne({ where: { key: MOBILE_HOOK_SETTING_KEYS.EMERGENCY_REASON } }),
    ]);

    return {
      enabled: this.parseBooleanSetting(enabledSetting?.value, false),
      reason: reasonSetting?.value || null,
    };
  }

  private async loadActionEnabledMap(actionTypes: string[]): Promise<Record<string, boolean>> {
    const enabledMap: Record<string, boolean> = {};
    if (!actionTypes.length) return enabledMap;

    const base = MOBILE_HOOK_SETTING_KEYS.ACTIONS_SETTINGS;
    const keys = actionTypes.map(actionType => `${base}.${actionType}`);

    const settings = await AppSetting.findAll({
      where: {
        key: {
          [Op.in]: keys,
        },
      },
    });
    const byKey = new Map(settings.map(record => [record.key, record.value]));

    for (const actionType of actionTypes) {
      const raw = byKey.get(`${base}.${actionType}`);
      if (!raw) {
        enabledMap[actionType] = this.defaultActionEnabled(actionType);
        continue;
      }

      try {
        const parsed = JSON.parse(raw) as { enabled?: unknown } | null;
        enabledMap[actionType] =
          parsed && typeof parsed === 'object' && typeof parsed.enabled === 'boolean'
            ? parsed.enabled
            : this.defaultActionEnabled(actionType);
      } catch {
        enabledMap[actionType] = this.defaultActionEnabled(actionType);
      }
    }

    return enabledMap;
  }

  /**
   * Clean up old events (optional maintenance)
   */
  async cleanupOldEvents(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    const deletedCount = await MobileAnalyticsEvent.destroy({
      where: {
        creationDate: { [Op.lt]: cutoffDate }
      }
    });

    return deletedCount;
  }
}

// Export singleton instance
export const mobileAnalyticsService = new MobileAnalyticsService();
