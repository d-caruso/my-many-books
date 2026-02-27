// ================================================================
// src/controllers/mobile/MobileAnalyticsController.ts
// Mobile analytics event ingestion endpoints
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { mobileAnalyticsService, MobileEventData } from '../../services/MobileAnalyticsService';

export interface MobileAnalyticsEvent {
  event_type: string;
  user_id?: string;
  timestamp: string;
  data: Record<string, unknown>;
  app_version?: string;
  device_info?: Record<string, unknown>;
}

export interface MobileAnalyticsEventBatch {
  events: MobileAnalyticsEvent[];
}

export class MobileAnalyticsController extends BaseController {
  /**
   * POST /api/mobile-analytics/events - Single event upload
   */
  async uploadEvent(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const body = this.parseBody<MobileAnalyticsEvent>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    // Validate event structure
    if (!body.event_type || !body.timestamp) {
      return this.createErrorResponse('Missing required fields: event_type, timestamp', 400);
    }

    try {
      // Sanitize event data
      const sanitizedEvent = this.sanitizeEvent(body);
      
      // Create event data for storage
      const eventData: MobileEventData = {
        eventId: this.generateEventId(),
        eventType: sanitizedEvent.event_type,
        userId: sanitizedEvent.user_id,
        timestamp: sanitizedEvent.timestamp,
        data: sanitizedEvent.data,
        appVersion: sanitizedEvent.app_version,
        deviceInfo: sanitizedEvent.device_info
      };
      
      // Store event in database
      const storedEvent = await mobileAnalyticsService.storeEvent(eventData);
      
      return this.createSuccessResponse({
        event_id: storedEvent.eventId,
        status: 'stored',
        processing_status: storedEvent.processingStatus,
        timestamp: new Date().toISOString()
      }, 'Event uploaded and stored successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(`Failed to process event: ${errorMessage}`, 500);
    }
  }

  /**
   * POST /api/mobile-analytics/events/batch - Batch event upload
   */
  async uploadEventBatch(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const body = this.parseBody<MobileAnalyticsEventBatch>(request);
    if (!body || !Array.isArray(body.events)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    // Validate batch size
    if (body.events.length === 0) {
      return this.createErrorResponse('Batch cannot be empty', 400);
    }

    if (body.events.length > 100) {
      return this.createErrorResponse('Batch size cannot exceed 100 events', 400);
    }

    try {
      // Prepare events for batch processing
      const eventsToProcess: MobileEventData[] = [];
      const validationErrors = [];

      for (let i = 0; i < body.events.length; i++) {
        const event = body.events[i];
        
        // Validate each event
        if (!event || !event.event_type || !event.timestamp) {
          validationErrors.push({
            index: i,
            error: 'Missing required fields: event_type, timestamp'
          });
          continue;
        }

        try {
          // Sanitize and prepare event
          const sanitizedEvent = this.sanitizeEvent(event);
          eventsToProcess.push({
            eventId: this.generateEventId(),
            eventType: sanitizedEvent.event_type,
            userId: sanitizedEvent.user_id,
            timestamp: sanitizedEvent.timestamp,
            data: sanitizedEvent.data,
            appVersion: sanitizedEvent.app_version,
            deviceInfo: sanitizedEvent.device_info
          });
        } catch (eventError) {
          validationErrors.push({
            index: i,
            error: eventError instanceof Error ? eventError.message : 'Unknown error'
          });
        }
      }

      // Store events in batch
      const { successful, failed } = await mobileAnalyticsService.storeBatchEvents(eventsToProcess);
      
      // Combine validation errors with storage errors
      const allErrors = [...validationErrors, ...failed];
      
      const results = successful.map((event, index) => ({
        index: index,
        event_id: event.eventId,
        status: 'stored',
        processing_status: event.processingStatus
      }));

      return this.createSuccessResponse({
        processed: successful.length,
        failed: allErrors.length,
        results: results,
        errors: allErrors,
        timestamp: new Date().toISOString()
      }, `Batch processed: ${successful.length} successful, ${allErrors.length} failed`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(`Failed to process batch: ${errorMessage}`, 500);
    }
  }

  /**
   * GET /api/mobile-analytics/stats - Event statistics
   */
  async getStats(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const stats = await mobileAnalyticsService.getAnalyticsStats();
      return this.createSuccessResponse(stats, 'Analytics statistics retrieved');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(`Failed to retrieve stats: ${errorMessage}`, 500);
    }
  }

  /**
   * GET /api/mobile-analytics/health - Analytics system health
   */
  async getHealth(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    return this.createSuccessResponse({
      status: 'operational',
      message: 'Mobile Analytics API is operational',
      version: '1.0.0',
      endpoints: {
        upload_single: '/api/mobile-analytics/events',
        upload_batch: '/api/mobile-analytics/events/batch',
        statistics: '/api/mobile-analytics/stats',
        health: '/api/mobile-analytics/health'
      }
    });
  }

  /**
   * Sanitize event data to prevent XSS and remove sensitive information
   */
  private sanitizeEvent(event: MobileAnalyticsEvent): MobileAnalyticsEvent {
    const sanitized: MobileAnalyticsEvent = {
      event_type: this.sanitizeString(event.event_type),
      timestamp: event.timestamp,
      data: this.sanitizeObject(event.data),
    };

    if (event.user_id) {
      sanitized.user_id = this.sanitizeString(event.user_id);
    }

    if (event.app_version) {
      sanitized.app_version = this.sanitizeString(event.app_version);
    }

    if (event.device_info) {
      sanitized.device_info = this.sanitizeObject(event.device_info);
    }

    return sanitized;
  }

  /**
   * Sanitize string to prevent XSS
   */
  private sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    return input.replace(/[<>"']/g, '').trim().slice(0, 500); // Max 500 chars
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    if (!obj || typeof obj !== 'object') return {};
    
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.slice(0, 100); // Limit array size
      }
      // Skip functions, null, undefined, or other complex types
    }
    
    return sanitized;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `mobile_${timestamp}_${random}`;
  }
}

// Export singleton instance
export const mobileAnalyticsController = new MobileAnalyticsController();