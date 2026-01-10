// ================================================================
// tests/integration/mobile/mobile-analytics.integration.test.ts
// Integration tests for mobile analytics event flow
// ================================================================

// Mock dependencies BEFORE imports
jest.mock('../../../src/config/database', () => ({
  default: {
    getInstance: jest.fn().mockReturnValue({
      authenticate: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));
jest.mock('@my-many-books/shared-i18n', () => ({
  initializeI18n: jest.fn().mockResolvedValue(undefined),
  i18n: {
    t: jest.fn((key: string) => key),
    changeLanguage: jest.fn(),
    language: 'en',
    isInitialized: true,
  },
}));

import request from 'supertest';
import app from '../../../src/app';
import { mobileAnalyticsService } from '../../../src/services/MobileAnalyticsService';

// Mock the models
jest.mock('../../../src/models', () => ({
  ModelManager: {
    initialize: jest.fn(),
    syncDatabase: jest.fn(),
    close: jest.fn(),
  },
  MobileAnalyticsEvent: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    count: jest.fn(),
  },
}));

// Mock the analytics service
jest.mock('../../../src/services/MobileAnalyticsService', () => ({
  mobileAnalyticsService: {
    storeEvent: jest.fn(),
    storeBatchEvents: jest.fn(),
    getAnalyticsStats: jest.fn(),
  },
}));

// Mock auth middleware to simulate mobile app authentication
jest.mock('../../../src/middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = {
      id: 'mobile_user_123',
      email: 'mobile@example.com',
      role: 'user',
      provider: 'mobile',
    };
    next();
  },
}));

describe('Mobile Analytics Integration Tests', () => {
  const BASE_URL = '/api/v1/mobile-analytics';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Ingestion Flow', () => {
    describe('POST /mobile-analytics/events - Single Event Upload', () => {
      it('should successfully process and store a mobile analytics event', async () => {
        const mockEvent = {
          eventId: 'mobile_1234567890_abc123',
          eventType: 'app_launch',
          userId: 'mobile_user_123',
          timestamp: '2024-01-10T10:30:00Z',
          data: { version: '1.0.0', platform: 'ios' },
          appVersion: '1.0.0',
          processingStatus: 'processed',
        };

        (mobileAnalyticsService.storeEvent as jest.Mock).mockResolvedValue(mockEvent);

        const eventPayload = {
          event_type: 'app_launch',
          user_id: 'mobile_user_123',
          timestamp: '2024-01-10T10:30:00Z',
          data: { version: '1.0.0', platform: 'ios' },
          app_version: '1.0.0',
        };

        const response = await request(app)
          .post(`${BASE_URL}/events`)
          .send(eventPayload)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('event_id');
        expect(response.body.data).toHaveProperty('status', 'stored');
        expect(response.body.data).toHaveProperty('processing_status', 'processed');
        
        expect(mobileAnalyticsService.storeEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'app_launch',
            userId: 'mobile_user_123',
            data: { version: '1.0.0', platform: 'ios' },
            appVersion: '1.0.0',
          })
        );
      });

      it('should validate required fields and reject invalid events', async () => {
        const invalidPayload = {
          event_type: 'app_launch',
          // Missing required timestamp
          data: { version: '1.0.0' },
        };

        const response = await request(app)
          .post(`${BASE_URL}/events`)
          .send(invalidPayload)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Missing required fields');
        expect(mobileAnalyticsService.storeEvent).not.toHaveBeenCalled();
      });

      it('should sanitize event data to prevent XSS attacks', async () => {
        const maliciousPayload = {
          event_type: '<script>alert("xss")</script>',
          user_id: 'mobile_user_123',
          timestamp: '2024-01-10T10:30:00Z',
          data: {
            title: '<img src="x" onerror="alert(1)">',
            description: 'Normal text',
          },
        };

        (mobileAnalyticsService.storeEvent as jest.Mock).mockResolvedValue({
          eventId: 'mobile_test_123',
          processingStatus: 'processed',
        });

        const response = await request(app)
          .post(`${BASE_URL}/events`)
          .send(maliciousPayload)
          .expect(200);

        expect(response.body.success).toBe(true);
        
        // Verify sanitization occurred
        expect(mobileAnalyticsService.storeEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: expect.not.stringContaining('<script>'),
            data: expect.objectContaining({
              title: expect.not.stringContaining('<img'),
            }),
          })
        );
      });

      it('should handle service errors gracefully', async () => {
        (mobileAnalyticsService.storeEvent as jest.Mock).mockRejectedValue(
          new Error('Database connection failed')
        );

        const validPayload = {
          event_type: 'app_launch',
          timestamp: '2024-01-10T10:30:00Z',
          data: { version: '1.0.0' },
        };

        const response = await request(app)
          .post(`${BASE_URL}/events`)
          .send(validPayload)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Failed to process event');
      });
    });

    describe('POST /mobile-analytics/events/batch - Batch Event Upload', () => {
      it('should successfully process multiple events in a batch', async () => {
        const batchPayload = {
          events: [
            {
              event_type: 'app_launch',
              timestamp: '2024-01-10T10:30:00Z',
              data: { version: '1.0.0' },
            },
            {
              event_type: 'button_click',
              timestamp: '2024-01-10T10:31:00Z',
              data: { button_id: 'search_btn' },
            },
            {
              event_type: 'page_view',
              timestamp: '2024-01-10T10:32:00Z',
              data: { page: 'home' },
            },
          ],
        };

        const mockBatchResult = {
          successful: [
            { eventId: 'mobile_1_abc', processingStatus: 'processed' },
            { eventId: 'mobile_2_def', processingStatus: 'processed' },
            { eventId: 'mobile_3_ghi', processingStatus: 'processed' },
          ],
          failed: [],
        };

        (mobileAnalyticsService.storeBatchEvents as jest.Mock).mockResolvedValue(mockBatchResult);

        const response = await request(app)
          .post(`${BASE_URL}/events/batch`)
          .send(batchPayload)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('processed', 3);
        expect(response.body.data).toHaveProperty('failed', 0);
        expect(response.body.data.results).toHaveLength(3);
        expect(response.body.data.errors).toHaveLength(0);
      });

      it('should handle partial batch failures correctly', async () => {
        const batchPayload = {
          events: [
            {
              event_type: 'valid_event',
              timestamp: '2024-01-10T10:30:00Z',
              data: { test: true },
            },
            {
              event_type: 'another_valid_event',
              timestamp: '2024-01-10T10:31:00Z',
              data: { test: true },
            },
          ],
        };

        const mockBatchResult = {
          successful: [
            { eventId: 'mobile_1_abc', processingStatus: 'processed' },
          ],
          failed: [
            { index: 1, error: 'Validation failed for event' },
          ],
        };

        (mobileAnalyticsService.storeBatchEvents as jest.Mock).mockResolvedValue(mockBatchResult);

        const response = await request(app)
          .post(`${BASE_URL}/events/batch`)
          .send(batchPayload)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('processed', 1);
        expect(response.body.data).toHaveProperty('failed', 1);
        expect(response.body.data.results).toHaveLength(1);
        expect(response.body.data.errors).toHaveLength(1);
      });

      it('should enforce batch size limits', async () => {
        const oversizedBatch = {
          events: Array(101).fill({
            event_type: 'test_event',
            timestamp: '2024-01-10T10:30:00Z',
            data: { test: true },
          }),
        };

        const response = await request(app)
          .post(`${BASE_URL}/events/batch`)
          .send(oversizedBatch)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Batch size cannot exceed 100 events');
        expect(mobileAnalyticsService.storeBatchEvents).not.toHaveBeenCalled();
      });

      it('should reject empty batches', async () => {
        const emptyBatch = { events: [] };

        const response = await request(app)
          .post(`${BASE_URL}/events/batch`)
          .send(emptyBatch)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Batch cannot be empty');
        expect(mobileAnalyticsService.storeBatchEvents).not.toHaveBeenCalled();
      });

      it('should validate each event in the batch', async () => {
        const mixedBatch = {
          events: [
            {
              event_type: 'valid_event',
              timestamp: '2024-01-10T10:30:00Z',
              data: { test: true },
            },
            {
              // Invalid: missing required fields
              event_type: 'invalid_event',
              data: { test: true },
            },
            {
              event_type: 'another_valid_event',
              timestamp: '2024-01-10T10:32:00Z',
              data: { test: true },
            },
          ],
        };

        const mockBatchResult = {
          successful: [
            { eventId: 'mobile_1_abc', processingStatus: 'processed' },
            { eventId: 'mobile_3_ghi', processingStatus: 'processed' },
          ],
          failed: [],
        };

        (mobileAnalyticsService.storeBatchEvents as jest.Mock).mockResolvedValue(mockBatchResult);

        const response = await request(app)
          .post(`${BASE_URL}/events/batch`)
          .send(mixedBatch)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.processed).toBe(2);
        expect(response.body.data.failed).toBe(1);
        expect(response.body.data.errors).toContainEqual(
          expect.objectContaining({
            index: 1,
            error: 'Missing required fields: event_type, timestamp',
          })
        );
      });
    });
  });

  describe('Analytics Retrieval Flow', () => {
    describe('GET /mobile-analytics/stats - Analytics Statistics', () => {
      it('should return comprehensive analytics statistics', async () => {
        const mockStats = {
          totalEvents: 1250,
          eventsToday: 85,
          eventsThisWeek: 420,
          eventsThisMonth: 1850,
          topEventTypes: [
            { eventType: 'app_launch', count: 450 },
            { eventType: 'button_click', count: 380 },
            { eventType: 'page_view', count: 320 },
          ],
          userActivity: {
            activeUsersToday: 15,
            activeUsersThisWeek: 75,
            activeUsersThisMonth: 180,
          },
          deviceMetrics: {
            totalDevices: 95,
            platformDistribution: {
              ios: 58,
              android: 37,
            },
          },
          performanceMetrics: {
            avgProcessingTime: 45,
            avgEventSize: 1.2,
            successRate: 98.5,
          },
          timeRange: {
            earliest: '2024-01-01T00:00:00Z',
            latest: '2024-01-10T10:30:00Z',
          },
        };

        (mobileAnalyticsService.getAnalyticsStats as jest.Mock).mockResolvedValue(mockStats);

        const response = await request(app)
          .get(`${BASE_URL}/stats`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockStats);
        expect(response.body.data).toHaveProperty('totalEvents', 1250);
        expect(response.body.data).toHaveProperty('topEventTypes');
        expect(response.body.data).toHaveProperty('userActivity');
        expect(response.body.data).toHaveProperty('performanceMetrics');
      });

      it('should handle empty analytics data gracefully', async () => {
        const emptyStats = {
          totalEvents: 0,
          eventsToday: 0,
          eventsThisWeek: 0,
          eventsThisMonth: 0,
          topEventTypes: [],
          userActivity: {
            activeUsersToday: 0,
            activeUsersThisWeek: 0,
            activeUsersThisMonth: 0,
          },
          deviceMetrics: {
            totalDevices: 0,
            platformDistribution: {},
          },
          performanceMetrics: {
            avgProcessingTime: 0,
            avgEventSize: 0,
            successRate: 0,
          },
          timeRange: {
            earliest: null,
            latest: null,
          },
        };

        (mobileAnalyticsService.getAnalyticsStats as jest.Mock).mockResolvedValue(emptyStats);

        const response = await request(app)
          .get(`${BASE_URL}/stats`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.totalEvents).toBe(0);
        expect(response.body.data.topEventTypes).toEqual([]);
      });

      it('should handle analytics service errors', async () => {
        (mobileAnalyticsService.getAnalyticsStats as jest.Mock).mockRejectedValue(
          new Error('Analytics calculation failed')
        );

        const response = await request(app)
          .get(`${BASE_URL}/stats`)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Failed to retrieve stats');
      });
    });

    describe('GET /mobile-analytics/health - Health Check', () => {
      it('should return operational status with endpoint information', async () => {
        const response = await request(app)
          .get(`${BASE_URL}/health`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('status', 'operational');
        expect(response.body.data).toHaveProperty('message', 'Mobile Analytics API is operational');
        expect(response.body.data).toHaveProperty('version', '1.0.0');
        expect(response.body.data).toHaveProperty('endpoints');
        expect(response.body.data.endpoints).toHaveProperty('upload_single');
        expect(response.body.data.endpoints).toHaveProperty('upload_batch');
        expect(response.body.data.endpoints).toHaveProperty('statistics');
        expect(response.body.data.endpoints).toHaveProperty('health');
      });

      it('should always return success for health checks', async () => {
        // Health check should be simple and not depend on external services
        const response = await request(app)
          .get(`${BASE_URL}/health`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('operational');
      });
    });
  });

  describe('Data Consistency and Edge Cases', () => {
    it('should handle concurrent event uploads gracefully', async () => {
      const eventPayload = {
        event_type: 'concurrent_test',
        timestamp: '2024-01-10T10:30:00Z',
        data: { test: 'concurrency' },
      };

      (mobileAnalyticsService.storeEvent as jest.Mock).mockResolvedValue({
        eventId: 'mobile_concurrent_123',
        processingStatus: 'processed',
      });

      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post(`${BASE_URL}/events`)
          .send(eventPayload)
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(mobileAnalyticsService.storeEvent).toHaveBeenCalledTimes(10);
    });

    it('should handle very large event payloads within limits', async () => {
      const largeData = {
        description: 'x'.repeat(1000), // Large but acceptable string
        metadata: Object.fromEntries(
          Array(50).fill(null).map((_, i) => [`key${i}`, `value${i}`])
        ),
      };

      const largeEventPayload = {
        event_type: 'large_data_test',
        timestamp: '2024-01-10T10:30:00Z',
        data: largeData,
      };

      (mobileAnalyticsService.storeEvent as jest.Mock).mockResolvedValue({
        eventId: 'mobile_large_123',
        processingStatus: 'processed',
      });

      const response = await request(app)
        .post(`${BASE_URL}/events`)
        .send(largeEventPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mobileAnalyticsService.storeEvent).toHaveBeenCalled();
    });

    it('should properly truncate oversized strings during sanitization', async () => {
      const oversizedPayload = {
        event_type: 'x'.repeat(1000), // Will be truncated to 500 chars
        timestamp: '2024-01-10T10:30:00Z',
        data: {
          longText: 'y'.repeat(2000), // Will be truncated to 500 chars
        },
      };

      (mobileAnalyticsService.storeEvent as jest.Mock).mockResolvedValue({
        eventId: 'mobile_truncated_123',
        processingStatus: 'processed',
      });

      const response = await request(app)
        .post(`${BASE_URL}/events`)
        .send(oversizedPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify truncation occurred in the service call
      expect(mobileAnalyticsService.storeEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: expect.stringMatching(/^x{500}$/), // Exactly 500 chars
          data: expect.objectContaining({
            longText: expect.stringMatching(/^y{500}$/), // Exactly 500 chars
          }),
        })
      );
    });
  });

  describe('Integration with Mobile Hook System', () => {
    it('should process analytics events that trigger mobile hooks', async () => {
      const hookTriggerEvent = {
        event_type: 'critical_error',
        timestamp: '2024-01-10T10:30:00Z',
        data: {
          error_type: 'crash',
          severity: 'high',
          stack_trace: 'Error: App crashed...',
        },
        app_version: '1.0.0',
      };

      (mobileAnalyticsService.storeEvent as jest.Mock).mockResolvedValue({
        eventId: 'mobile_hook_trigger_123',
        processingStatus: 'processed',
      });

      const response = await request(app)
        .post(`${BASE_URL}/events`)
        .send(hookTriggerEvent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mobileAnalyticsService.storeEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'critical_error',
          data: expect.objectContaining({
            error_type: 'crash',
            severity: 'high',
          }),
        })
      );
    });
  });

  describe('Security and Performance', () => {
    it('should reject malformed JSON payloads', async () => {
      const response = await request(app)
        .post(`${BASE_URL}/events`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json"}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid JSON payload');
    });

    it('should handle missing Content-Type header gracefully', async () => {
      const validPayload = {
        event_type: 'test_event',
        timestamp: '2024-01-10T10:30:00Z',
        data: { test: true },
      };

      (mobileAnalyticsService.storeEvent as jest.Mock).mockResolvedValue({
        eventId: 'mobile_no_content_type_123',
        processingStatus: 'processed',
      });

      const response = await request(app)
        .post(`${BASE_URL}/events`)
        .send(JSON.stringify(validPayload))
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should strip potentially dangerous nested objects', async () => {
      const dangerousPayload = {
        event_type: 'nested_test',
        timestamp: '2024-01-10T10:30:00Z',
        data: {
          safe: 'data',
          nested: {
            deep: {
              dangerous: 'function() { alert("hack"); }',
              safe: 'value',
            },
          },
          arrays: ['safe', 'values', { nested: 'object' }],
        },
      };

      (mobileAnalyticsService.storeEvent as jest.Mock).mockResolvedValue({
        eventId: 'mobile_sanitized_123',
        processingStatus: 'processed',
      });

      const response = await request(app)
        .post(`${BASE_URL}/events`)
        .send(dangerousPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify deep sanitization occurred
      const serviceCall = (mobileAnalyticsService.storeEvent as jest.Mock).mock.calls[0][0];
      expect(serviceCall.data).toHaveProperty('safe', 'data');
      expect(serviceCall.data.nested).toHaveProperty('deep');
      expect(serviceCall.data.arrays).toHaveLength(3); // Limited to 100, so all should be there
    });
  });
});