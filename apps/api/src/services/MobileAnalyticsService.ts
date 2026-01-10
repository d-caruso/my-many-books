// ================================================================
// src/services/MobileAnalyticsService.ts
// Mobile analytics data processing service
// ================================================================

import { MobileAnalyticsEvent } from '../models/MobileAnalyticsEvent';
import { Op } from 'sequelize';
import { getLogger } from '@my-many-books/shared-logging';

export interface MobileEventData {
  eventId: string;
  eventType: string;
  userId?: string;
  timestamp: string;
  data: Record<string, unknown>;
  appVersion?: string;
  deviceInfo?: Record<string, unknown>;
}

export interface AnalyticsStats {
  events_processed_today: number;
  events_processed_total: number;
  error_rate: number;
  avg_processing_time_ms: number;
  top_event_types: Array<{ event_type: string; count: number }>;
  last_processed: string | null;
  system_status: 'active' | 'degraded' | 'error';
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
  async getAnalyticsStats(): Promise<AnalyticsStats> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [
        eventsToday,
        eventsTotal,
        failedEvents,
        topEventTypes,
        lastProcessed
      ] = await Promise.all([
        // Events processed today
        MobileAnalyticsEvent.count({
          where: {
            processingStatus: 'processed',
            creationDate: { [Op.gte]: today }
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
        })
      ]);

      const totalEvents = eventsTotal + failedEvents;
      const errorRate = totalEvents > 0 ? (failedEvents / totalEvents) : 0;

      // Determine system status
      let systemStatus: 'active' | 'degraded' | 'error' = 'active';
      if (errorRate > 0.1) systemStatus = 'degraded';
      if (errorRate > 0.3) systemStatus = 'error';

      return {
        events_processed_today: eventsToday,
        events_processed_total: eventsTotal,
        error_rate: Math.round(errorRate * 100) / 100,
        avg_processing_time_ms: await this.calculateAvgProcessingTime(),
        top_event_types: topEventTypes,
        last_processed: lastProcessed?.updateDate?.toISOString() || null,
        system_status: systemStatus
      };
    } catch (error) {
      throw new Error(`Failed to get analytics stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get top event types by count
   */
  private async getTopEventTypes(): Promise<Array<{ event_type: string; count: number }>> {
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
        event_type: result.eventType,
        count: parseInt(result.count, 10)
      }));
    } catch (error) {
      getLogger().error({ 
        err: error instanceof Error ? error : new Error(String(error))
      }, 'Failed to get top event types');
      return [];
    }
  }

  /**
   * Calculate average processing time
   */
  private async calculateAvgProcessingTime(): Promise<number> {
    try {
      const result = await MobileAnalyticsEvent.findOne({
        attributes: [
          [MobileAnalyticsEvent.sequelize!.fn('AVG', 
            MobileAnalyticsEvent.sequelize!.literal('EXTRACT(EPOCH FROM (update_date - creation_date)) * 1000')
          ), 'avgTime']
        ],
        where: { 
          processingStatus: 'processed',
          updateDate: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        },
        raw: true
      }) as { avgTime: string } | null;

      return result?.avgTime ? Math.round(parseFloat(result.avgTime)) : 0;
    } catch (error) {
      getLogger().error({ 
        err: error instanceof Error ? error : new Error(String(error))
      }, 'Failed to calculate avg processing time');
      return 0;
    }
  }

  /**
   * Process event asynchronously (placeholder for real processing logic)
   */
  private async processEventAsync(eventId: number): Promise<void> {
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      // Mark as processed
      await MobileAnalyticsEvent.update(
        { processingStatus: 'processed' },
        { where: { id: eventId } }
      );
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