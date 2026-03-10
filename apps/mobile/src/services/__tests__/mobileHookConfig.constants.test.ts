// ================================================================
// src/services/__tests__/mobileHookConfig.constants.test.ts
// Test action mappings use constants consistently
// ================================================================

import {
  MOBILE_EVENTS,
  RESOURCE_TYPES,
  OPERATION_TYPES,
  QUEUE_OPERATION_STATUS,
  MOBILE_CONFIG_LIMITS
} from '../hooks/eventsSchema';

import { MOBILE_APP_SETTING_KEYS, MOBILE_HOOK_SETTING_KEYS } from '@my-many-books/shared-types';
import { mobileHookConfigService } from '../hooks/mobileHookConfigService';

describe('Mobile Hook Configuration Constants', () => {
  describe('Event constants are properly exported', () => {
    it('should have MOBILE_EVENTS constant with proper structure', () => {
      expect(MOBILE_EVENTS).toBeDefined();
      expect(typeof MOBILE_EVENTS).toBe('object');
      expect(Object.isFrozen(MOBILE_EVENTS)).toBe(true);
      
      // Check entity events exist
      expect(MOBILE_EVENTS.BOOK).toBeDefined();
      expect(MOBILE_EVENTS.AUTHOR).toBeDefined();
      expect(MOBILE_EVENTS.CATEGORY).toBeDefined();
      
      // Check CRUD operations exist for entities
      expect(MOBILE_EVENTS.BOOK.CREATE.START).toBeDefined();
      expect(MOBILE_EVENTS.BOOK.READ.SUCCESS).toBeDefined();
      expect(MOBILE_EVENTS.BOOK.UPDATE.FAILED).toBeDefined();
      expect(MOBILE_EVENTS.BOOK.DELETE.START).toBeDefined();
      
      // Check sync operations exist
      expect(MOBILE_EVENTS.BOOK.SYNC.PULL.START).toBeDefined();
      expect(MOBILE_EVENTS.BOOK.SYNC.CONFLICT.DETECTED).toBeDefined();
      
      // Check system events exist
      expect(MOBILE_EVENTS.QUEUE.ENQUEUE).toBeDefined();
      expect(MOBILE_EVENTS.SYNC.START).toBeDefined();
      expect(MOBILE_EVENTS.APP.STARTUP).toBeDefined();
      expect(MOBILE_EVENTS.ERROR.UNHANDLED).toBeDefined();
    });

    it('should have RESOURCE_TYPES constant properly imported', () => {
      expect(RESOURCE_TYPES).toBeDefined();
      expect(Object.isFrozen(RESOURCE_TYPES)).toBe(true);
      
      // Check required resource types exist
      expect(RESOURCE_TYPES.BOOK).toBe('book');
      expect(RESOURCE_TYPES.AUTHOR).toBe('author');
      expect(RESOURCE_TYPES.CATEGORY).toBe('category');
      expect(RESOURCE_TYPES.MOBILE_CONFIG).toBe('mobile_config');
    });

    it('should have operation constants properly defined', () => {
      expect(OPERATION_TYPES).toBeDefined();
      expect(Object.isFrozen(OPERATION_TYPES)).toBe(true);
      
      expect(OPERATION_TYPES.CREATE).toBe('CREATE');
      expect(OPERATION_TYPES.UPDATE).toBe('UPDATE');
      expect(OPERATION_TYPES.DELETE).toBe('DELETE');
      
      expect(QUEUE_OPERATION_STATUS).toBeDefined();
      expect(Object.isFrozen(QUEUE_OPERATION_STATUS)).toBe(true);

      expect(QUEUE_OPERATION_STATUS.PENDING).toBe('pending');
      expect(QUEUE_OPERATION_STATUS.RETRYING).toBe('retrying');
      expect(QUEUE_OPERATION_STATUS.FAILED).toBe('failed');
    });
  });

  describe('Mobile configuration constants', () => {
    it('should have mobile config keys properly defined', () => {
      expect(MOBILE_HOOK_SETTING_KEYS).toBeDefined();
      expect(Object.isFrozen(MOBILE_HOOK_SETTING_KEYS)).toBe(true);
      
      // Check all expected config keys exist
      expect(MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED).toBe('mobile.hooks.global.analytics.enabled');
      expect(MOBILE_HOOK_SETTING_KEYS.ERROR_REPORTING_ENABLED).toBe('mobile.hooks.global.error_reporting.enabled');
      expect(MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED).toBe('mobile.hooks.global.performance_monitoring.enabled');
      expect(MOBILE_APP_SETTING_KEYS.BATCH_UPLOAD_INTERVAL).toBe('mobile.app.global.batch_upload_interval');
      expect(MOBILE_APP_SETTING_KEYS.MAX_OFFLINE_EVENTS).toBe('mobile.app.global.max_offline_events');
    });

    it('should have mobile config limits properly defined', () => {
      expect(MOBILE_CONFIG_LIMITS).toBeDefined();
      expect(Object.isFrozen(MOBILE_CONFIG_LIMITS)).toBe(true);
      
      // Check validation limits
      expect(MOBILE_CONFIG_LIMITS.MIN_BATCH_INTERVAL).toBe(60);
      expect(MOBILE_CONFIG_LIMITS.MAX_BATCH_INTERVAL).toBe(3600);
      expect(MOBILE_CONFIG_LIMITS.MIN_OFFLINE_EVENTS).toBe(100);
      expect(MOBILE_CONFIG_LIMITS.MAX_OFFLINE_EVENTS).toBe(10000);
      
      // Check memory limits
      expect(MOBILE_CONFIG_LIMITS.BASE_MEMORY_KB).toBeDefined();
      expect(MOBILE_CONFIG_LIMITS.ANALYTICS_MEMORY_KB).toBeDefined();
      expect(MOBILE_CONFIG_LIMITS.MEMORY_THRESHOLD_KB).toBe(1000);
    });
  });

  describe('Constant consistency validation', () => {
    it('should have consistent event naming patterns', () => {
      // All entity events should follow the same pattern
      const entityTypes = ['BOOK', 'AUTHOR', 'CATEGORY'];
      const crudOperations = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
      const operationStates = ['START', 'SUCCESS', 'FAILED'];

      for (const entity of entityTypes) {
        for (const operation of crudOperations) {
          for (const state of operationStates) {
            const eventPath = MOBILE_EVENTS[entity]?.[operation]?.[state];
            expect(eventPath).toBeDefined();
            expect(typeof eventPath).toBe('string');
            
            // Event should follow pattern: entity.operation.state (lowercase)
            const expectedPattern = `${entity.toLowerCase()}.${operation.toLowerCase()}.${state.toLowerCase()}`;
            expect(eventPath).toBe(expectedPattern);
          }
        }
      }
    });

    it('should have consistent sync event patterns', () => {
      const syncOperations = ['PULL', 'MERGE'];
      const syncStates = ['START', 'SUCCESS', 'FAILED'];
      const entityTypes = ['BOOK', 'AUTHOR', 'CATEGORY'];

      for (const entity of entityTypes) {
        for (const operation of syncOperations) {
          for (const state of syncStates) {
            const eventPath = MOBILE_EVENTS[entity]?.SYNC?.[operation]?.[state];
            expect(eventPath).toBeDefined();
            expect(typeof eventPath).toBe('string');
            
            const expectedPattern = `${entity.toLowerCase()}.sync.${operation.toLowerCase()}.${state.toLowerCase()}`;
            expect(eventPath).toBe(expectedPattern);
          }
        }
      }
    });

    it('should have immutable constants', () => {
      // All exported constants should be frozen
      expect(Object.isFrozen(MOBILE_EVENTS)).toBe(true);
      expect(Object.isFrozen(RESOURCE_TYPES)).toBe(true);
      expect(Object.isFrozen(OPERATION_TYPES)).toBe(true);
      expect(Object.isFrozen(QUEUE_OPERATION_STATUS)).toBe(true);
      expect(Object.isFrozen(MOBILE_HOOK_SETTING_KEYS)).toBe(true);
      expect(Object.isFrozen(MOBILE_CONFIG_LIMITS)).toBe(true);

      // Object.isFrozen() above already verifies immutability
    });
  });

  describe('Constants usage validation', () => {
    it('should validate that mobile config service uses proper constants', () => {
      // The service should be defined and use our constants in its implementation
      expect(mobileHookConfigService).toBeDefined();
      
      // Test that the service recognizes our constant values
      const cacheStatus = mobileHookConfigService.getCacheStatus();
      expect(cacheStatus.ttl).toBe(5 * 60 * 1000); // 5 minute TTL should be consistent
    });

    it('should have setting keys for common event types', () => {
      const requiredKeys = [
        'ANALYTICS_ENABLED',
        'ERROR_REPORTING_ENABLED',
        'PERFORMANCE_MONITORING_ENABLED'
      ];

      // These should map to our MOBILE_HOOK_SETTING_KEYS structure
      for (const key of requiredKeys) {
        expect(MOBILE_HOOK_SETTING_KEYS).toHaveProperty(key);
        expect(MOBILE_HOOK_SETTING_KEYS[key]).toMatch(/^mobile\.hooks\./);
      }
    });

    it('should validate resource types are consistently cased', () => {
      // All resource types should be lowercase for consistency with mobile usage
      const resourceValues = Object.values(RESOURCE_TYPES);
      
      for (const resourceType of resourceValues) {
        expect(resourceType).toBe(resourceType.toLowerCase());
        expect(resourceType).not.toContain(' '); // No spaces
        expect(resourceType).not.toContain('-'); // No hyphens (use underscore if needed)
      }
    });
  });
});