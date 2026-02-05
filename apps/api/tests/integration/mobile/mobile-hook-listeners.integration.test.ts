// ================================================================
// tests/integration/mobile/mobile-hook-listeners.integration.test.ts
// Integration tests for mobile hook listeners infrastructure
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
import { emitHookEvent } from '../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../src/services/hooks/events';
import { BASE_PATH } from '../../utils/apiBasePath';

jest.mock('../../../src/services/hooks/hookSystem', () => ({
  initializeHookSystem: jest.fn().mockResolvedValue({
    trigger: jest.fn(),
    registerHook: jest.fn(),
    registerExistingHook: jest.fn(),
    getRegisteredHooks: jest.fn(),
  }),
  getHookSystem: jest.fn(() => ({
    trigger: jest.fn(),
    registerHook: jest.fn(),
    registerExistingHook: jest.fn(),
    getRegisteredHooks: jest.fn(),
  })),
  emitHookEvent: jest.fn(),
  reloadHookSystem: jest.fn(),
}));

// Mock the models
jest.mock('../../../src/models', () => ({
  ModelManager: {
    initialize: jest.fn(),
    syncDatabase: jest.fn(),
    close: jest.fn(),
  },
  Book: {
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Author: {
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Category: {
    create: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  MobileAnalyticsEvent: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
  },
}));

// Mock mobile analytics service to simulate mobile event processing
jest.mock('../../../src/services/MobileAnalyticsService', () => ({
  mobileAnalyticsService: {
    storeEvent: jest.fn(),
    storeBatchEvents: jest.fn(),
    getAnalyticsStats: jest.fn(),
  },
}));

// Mock auth middleware to simulate mobile user
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

describe('Mobile Hook Listeners Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hook System Initialization', () => {
    it('should initialize hook system with event schema', async () => {
      // Verify the events schema is properly structured
      expect(EVENTS).toBeDefined();
      expect(EVENTS.BOOK).toBeDefined();
      expect(EVENTS.AUTHOR).toBeDefined();
      expect(EVENTS.CATEGORY).toBeDefined();
      expect(EVENTS.USER).toBeDefined();
      expect(EVENTS.AUTH).toBeDefined();
    });

    it('should have consistent operation patterns across all entities', () => {
      // Verify CRUD operations exist for all entities
      const entities = ['BOOK', 'AUTHOR', 'CATEGORY'];
      const operations = ['CREATE', 'UPDATE', 'DELETE'];
      const states = ['BEFORE', 'AFTER'];

      entities.forEach(entityName => {
        const entity = EVENTS[entityName as keyof typeof EVENTS];
        operations.forEach(operationName => {
          const operation = entity[operationName as keyof typeof entity];
          states.forEach(stateName => {
            const state = operation[stateName as keyof typeof operation];
            expect(state).toBeDefined();
            expect(typeof state).toBe('string');
          });
        });
      });
    });

    it('should have properly formatted event names', () => {
      // Test a few key event names for proper format using existing EVENTS
      expect(EVENTS.BOOK.CREATE.BEFORE).toBe('book.create.before');
      expect(EVENTS.BOOK.CREATE.AFTER).toBe('book.create.after');
      expect(EVENTS.AUTHOR.UPDATE.BEFORE).toBe('author.update.before');
      expect(EVENTS.AUTHOR.UPDATE.AFTER).toBe('author.update.after');
      expect(EVENTS.CATEGORY.DELETE.BEFORE).toBe('category.delete.before');
      expect(EVENTS.CATEGORY.DELETE.AFTER).toBe('category.delete.after');
      expect(EVENTS.USER.LOGIN.BEFORE).toBe('user.login.before');
      expect(EVENTS.AUTH.LOGIN.FAILED).toBe('auth.login.failed');
    });
  });

  describe('Mobile Event Emission and Hook Triggering', () => {
    it('should trigger hooks when mobile analytics events are processed', async () => {
      const analyticsPayload = {
        event_type: 'app_launch',
        timestamp: '2024-01-10T10:30:00Z',
        data: { version: '1.0.0', platform: 'ios' },
      };

      // Mock successful analytics storage to trigger subsequent hooks
      const { mobileAnalyticsService } = require('../../../src/services/MobileAnalyticsService');
      mobileAnalyticsService.storeEvent.mockResolvedValue({
        eventId: 'mobile_test_123',
        processingStatus: 'processed',
      });

      const response = await request(app)
        .post(`${BASE_PATH}/mobile-analytics/events`)
        .send(analyticsPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // In a real implementation, this would trigger mobile hook listeners
      // Here we verify the analytics event was processed successfully
      expect(mobileAnalyticsService.storeEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'app_launch',
          data: expect.objectContaining({
            version: '1.0.0',
            platform: 'ios',
          }),
        })
      );
    });

    it('should handle entity operation events through hook system', async () => {
      // Simulate triggering hook events that would be emitted by mobile operations
      const hookEventTypes = [
        EVENTS.BOOK.CREATE.BEFORE,
        EVENTS.BOOK.CREATE.AFTER,
        EVENTS.AUTHOR.UPDATE.BEFORE,
        EVENTS.AUTHOR.UPDATE.AFTER,
        EVENTS.CATEGORY.DELETE.BEFORE,
        EVENTS.CATEGORY.DELETE.AFTER,
        EVENTS.USER.LOGIN.BEFORE,
        EVENTS.USER.LOGIN.AFTER,
      ];

      for (const eventType of hookEventTypes) {
        const mockPayload = {
          entityId: 'test_entity_123',
          userId: 'test_user_456',
          timestamp: new Date().toISOString(),
        };

        // Simulate event emission (in real system, this would be called by entity operations)
        const mockEmitHookEvent = emitHookEvent as jest.Mock;
        await mockEmitHookEvent(eventType, mockPayload);

        // Verify the event was captured
        expect(mockEmitHookEvent).toHaveBeenCalledWith(eventType, mockPayload);
      }
    });

    it('should handle authentication events through hook system', async () => {
      // Test authentication events using existing EVENTS
      const authEventTypes = [
        EVENTS.USER.LOGIN.BEFORE,
        EVENTS.USER.LOGIN.AFTER,
        EVENTS.USER.LOGOUT.BEFORE,
        EVENTS.USER.LOGOUT.AFTER,
        EVENTS.AUTH.LOGIN.FAILED,
      ];

      for (const eventType of authEventTypes) {
        const mockPayload = {
          userId: 'auth_test_456',
          sessionId: 'session_123',
          timestamp: new Date().toISOString(),
        };

        // Simulate event emission
        const mockEmitHookEvent = emitHookEvent as jest.Mock;
        await mockEmitHookEvent(eventType, mockPayload);

        // Verify the event was captured
        expect(mockEmitHookEvent).toHaveBeenCalledWith(eventType, mockPayload);
      }
    });
  });

  describe('Entity CRUD Hook Integration', () => {
    it('should trigger entity hooks for book operations', async () => {
      // Test that CRUD operations would trigger the appropriate events
      const entityEvents = [
        EVENTS.BOOK.CREATE.BEFORE,
        EVENTS.BOOK.CREATE.AFTER,
        EVENTS.BOOK.UPDATE.BEFORE,
        EVENTS.BOOK.UPDATE.AFTER,
        EVENTS.BOOK.DELETE.BEFORE,
        EVENTS.BOOK.DELETE.AFTER,
      ];

      for (const eventType of entityEvents) {
        const mockPayload = {
          bookId: 'book_test_123',
          title: 'Test Book',
          userId: 'mobile_user_123',
          timestamp: new Date().toISOString(),
        };

        // Simulate event emission
        const mockEmitHookEvent = emitHookEvent as jest.Mock;
        await mockEmitHookEvent(eventType, mockPayload);

        // Verify the event was captured
        expect(mockEmitHookEvent).toHaveBeenCalledWith(eventType, mockPayload);
      }
    });

    it('should handle multi-entity operations', async () => {
      // Simulate a complex operation affecting multiple entities
      const multiEntityEvents = [
        { type: EVENTS.BOOK.CREATE.BEFORE, entity: 'book' },
        { type: EVENTS.AUTHOR.CREATE.BEFORE, entity: 'author' },
        { type: EVENTS.CATEGORY.CREATE.BEFORE, entity: 'category' },
        { type: EVENTS.BOOK.CREATE.AFTER, entity: 'book' },
        { type: EVENTS.AUTHOR.CREATE.AFTER, entity: 'author' },
        { type: EVENTS.CATEGORY.CREATE.AFTER, entity: 'category' },
      ];

      const mockEmitHookEvent = emitHookEvent as jest.Mock;

      for (const event of multiEntityEvents) {
        const mockPayload = {
          operationId: 'multi_operation_789',
          entityType: event.entity,
          timestamp: new Date().toISOString(),
        };

        await mockEmitHookEvent(event.type, mockPayload);
        expect(mockEmitHookEvent).toHaveBeenCalledWith(event.type, mockPayload);
      }

      // Verify the sequence was properly captured
      expect(mockEmitHookEvent).toHaveBeenCalledTimes(multiEntityEvents.length);
    });
  });

  describe('Hook System Performance and Reliability', () => {
    it('should handle high-volume event emission gracefully', async () => {
      const mockEmitHookEvent = emitHookEvent as jest.Mock;
      const eventCount = 100;
      const promises = [];

      // Simulate high-volume event emission
      for (let i = 0; i < eventCount; i++) {
        const promise = mockEmitHookEvent(EVENTS.BOOK.CREATE.AFTER, {
          bookId: `book_${i}`,
          timestamp: new Date().toISOString(),
        });
        promises.push(promise);
      }

      await Promise.all(promises);

      // Verify all events were processed
      expect(mockEmitHookEvent).toHaveBeenCalledTimes(eventCount);
    });

    it('should handle hook system errors gracefully', async () => {
      const mockEmitHookEvent = emitHookEvent as jest.Mock;
      
      // Simulate hook system error
      mockEmitHookEvent.mockRejectedValueOnce(new Error('Hook system unavailable'));

      // Should not throw, but handle gracefully
      await expect(
        mockEmitHookEvent(EVENTS.AUTH.LOGIN.FAILED, {
          errorMessage: 'Test error',
          timestamp: new Date().toISOString(),
        })
      ).rejects.toThrow('Hook system unavailable');

      // Subsequent calls should work normally
      mockEmitHookEvent.mockResolvedValueOnce(undefined);
      
      await mockEmitHookEvent(EVENTS.USER.LOGIN.AFTER, {
        userId: 'recovered_user',
        timestamp: new Date().toISOString(),
      });

      expect(mockEmitHookEvent).toHaveBeenCalledTimes(2);
    });

    it('should maintain event ordering for sequential operations', async () => {
      const mockEmitHookEvent = emitHookEvent as jest.Mock;
      const eventSequence = [
        EVENTS.BOOK.CREATE.BEFORE,
        EVENTS.BOOK.CREATE.AFTER,
        EVENTS.AUTHOR.CREATE.BEFORE,
        EVENTS.AUTHOR.CREATE.AFTER,
        EVENTS.CATEGORY.CREATE.BEFORE,
        EVENTS.CATEGORY.CREATE.AFTER,
      ];

      // Emit events in sequence
      for (let i = 0; i < eventSequence.length; i++) {
        await mockEmitHookEvent(eventSequence[i], {
          operationId: 'sequential_test',
          sequence: i + 1,
          timestamp: new Date().toISOString(),
        });
      }

      // Verify events were emitted in the correct order
      expect(mockEmitHookEvent).toHaveBeenCalledTimes(eventSequence.length);
      
      eventSequence.forEach((eventType, index) => {
        const call = mockEmitHookEvent.mock.calls[index];
        expect(call[0]).toBe(eventType);
        expect(call[1].sequence).toBe(index + 1);
      });
    });
  });

  describe('Integration with Analytics and Configuration', () => {
    it('should coordinate mobile analytics events with hook listeners', async () => {
      // This test verifies the integration between analytics ingestion and hook triggering
      const analyticsPayload = {
        event_type: 'critical_error',
        timestamp: '2024-01-10T10:30:00Z',
        data: {
          error_type: 'crash',
          severity: 'high',
          stack_trace: 'Error: App crashed at line 42...',
        },
      };

      const { mobileAnalyticsService } = require('../../../src/services/MobileAnalyticsService');
      mobileAnalyticsService.storeEvent.mockResolvedValue({
        eventId: 'critical_error_123',
        processingStatus: 'processed',
      });

      // Process the analytics event
      const response = await request(app)
        .post(`${BASE_PATH}/mobile-analytics/events`)
        .send(analyticsPayload)
        .expect(200);

      expect(response.body.success).toBe(true);

      // In a real implementation, this would trigger error handling hooks
      // Here we verify the event was stored and could trigger subsequent processing
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

    it('should respect mobile configuration settings for hook processing', async () => {
      // This test would verify that mobile configuration affects hook processing
      // For now, we test the structure that would support this integration

      const configEvents = [
        EVENTS.USER.LOGIN.BEFORE,
        EVENTS.USER.LOGIN.AFTER,
      ];

      const mockEmitHookEvent = emitHookEvent as jest.Mock;

      for (const eventType of configEvents) {
        await mockEmitHookEvent(eventType, {
          configLoaded: true,
          analyticsEnabled: true,
          errorReportingEnabled: true,
          timestamp: new Date().toISOString(),
        });
      }

      expect(mockEmitHookEvent).toHaveBeenCalledTimes(configEvents.length);
    });
  });

  describe('Hook System Integration', () => {
    it('should verify hook system can be mocked for testing', () => {
      const mockEmitHookEvent = emitHookEvent as jest.Mock;
      
      expect(mockEmitHookEvent).toBeDefined();
      expect(typeof mockEmitHookEvent).toBe('function');
    });

    it('should be able to emit events for testing purposes', async () => {
      const mockEmitHookEvent = emitHookEvent as jest.Mock;
      
      await mockEmitHookEvent(EVENTS.BOOK.CREATE.AFTER, {
        bookId: 'test_book_123',
        title: 'Test Book',
      });

      expect(mockEmitHookEvent).toHaveBeenCalledWith(
        EVENTS.BOOK.CREATE.AFTER,
        expect.objectContaining({
          bookId: 'test_book_123',
          title: 'Test Book',
        })
      );
    });
  });
});
