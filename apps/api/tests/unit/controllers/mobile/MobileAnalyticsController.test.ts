// ================================================================
// tests/unit/controllers/mobile/MobileAnalyticsController.test.ts
// Mobile Analytics Controller tests
// ================================================================

import request from 'supertest';
import express from 'express';
import { mobileAnalyticsController } from '../../../../src/controllers/mobile/MobileAnalyticsController';
import { mobileAnalyticsService } from '../../../../src/services/MobileAnalyticsService';

// Mock the service
jest.mock('../../../../src/services/MobileAnalyticsService');

const mockedService = jest.mocked(mobileAnalyticsService);

describe('MobileAnalyticsController', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();
  });

  describe('POST /events', () => {
    it('should upload single event successfully', async () => {
      const mockEvent = {
        id: 1,
        eventId: 'test_event_123',
        eventType: 'user_action',
        processingStatus: 'pending' as const,
        creationDate: new Date(),
        updateDate: new Date(),
      };

      mockedService.storeEvent.mockResolvedValue(mockEvent as any);

      const eventData = {
        event_type: 'user_action',
        timestamp: '2026-01-09T18:00:00.000Z',
        data: { action: 'button_click' },
        user_id: 'user123'
      };

      app.post('/events', async (req, res) => {
        const result = await mobileAnalyticsController.uploadEvent(req as any);
        res.status(result.success ? 200 : 500).json(result);
      });

      const response = await request(app)
        .post('/events')
        .send(eventData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.event_id).toBe('test_event_123');
      expect(response.body.data.status).toBe('stored');
      expect(mockedService.storeEvent).toHaveBeenCalledTimes(1);
    });

    it('should return error for missing required fields', async () => {
      const invalidEventData = {
        data: { action: 'button_click' }
        // Missing event_type and timestamp
      };

      app.post('/events', async (req, res) => {
        const result = await mobileAnalyticsController.uploadEvent(req as any);
        res.status(result.success ? 200 : 400).json(result);
      });

      const response = await request(app)
        .post('/events')
        .send(invalidEventData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('POST /events/batch', () => {
    it('should upload batch events successfully', async () => {
      const mockResults = {
        successful: [
          { eventId: 'event1', processingStatus: 'pending' as const },
          { eventId: 'event2', processingStatus: 'pending' as const }
        ],
        failed: []
      };

      mockedService.storeBatchEvents.mockResolvedValue(mockResults as any);

      const batchData = {
        events: [
          {
            event_type: 'user_action',
            timestamp: '2026-01-09T18:00:00.000Z',
            data: { action: 'button_click' }
          },
          {
            event_type: 'page_view',
            timestamp: '2026-01-09T18:01:00.000Z',
            data: { page: 'dashboard' }
          }
        ]
      };

      app.post('/events/batch', async (req, res) => {
        const result = await mobileAnalyticsController.uploadEventBatch(req as any);
        res.status(result.success ? 200 : 500).json(result);
      });

      const response = await request(app)
        .post('/events/batch')
        .send(batchData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processed).toBe(2);
      expect(response.body.data.failed).toBe(0);
      expect(mockedService.storeBatchEvents).toHaveBeenCalledTimes(1);
    });

    it('should handle batch size limit', async () => {
      const events = Array.from({ length: 101 }, (_, i) => ({
        event_type: 'test_event',
        timestamp: '2026-01-09T18:00:00.000Z',
        data: { index: i }
      }));

      app.post('/events/batch', async (req, res) => {
        const result = await mobileAnalyticsController.uploadEventBatch(req as any);
        res.status(result.success ? 200 : 400).json(result);
      });

      const response = await request(app)
        .post('/events/batch')
        .send({ events })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Batch size cannot exceed 100 events');
    });
  });

  describe('GET /stats', () => {
    it('should return analytics statistics', async () => {
      const mockStats = {
        events_processed_today: 150,
        events_processed_total: 1000,
        error_rate: 0.02,
        avg_processing_time_ms: 45,
        top_event_types: [
          { event_type: 'user_action', count: 500 },
          { event_type: 'page_view', count: 300 }
        ],
        last_processed: '2026-01-09T18:00:00.000Z',
        system_status: 'active' as const
      };

      mockedService.getAnalyticsStats.mockResolvedValue(mockStats);

      app.get('/stats', async (req, res) => {
        const result = await mobileAnalyticsController.getStats(req as any);
        res.status(result.success ? 200 : 500).json(result);
      });

      const response = await request(app)
        .get('/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events_processed_today).toBe(150);
      expect(response.body.data.system_status).toBe('active');
      expect(mockedService.getAnalyticsStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      app.get('/health', async (req, res) => {
        const result = await mobileAnalyticsController.getHealth(req as any);
        res.status(result.success ? 200 : 500).json(result);
      });

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('operational');
      expect(response.body.data.version).toBe('1.0.0');
      expect(response.body.data.endpoints).toBeDefined();
    });
  });
});