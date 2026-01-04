import { MOBILE_EVENTS } from '../events';

describe('Mobile Events', () => {
  describe('Event Structure', () => {
    it('should have all required event categories', () => {
      expect(MOBILE_EVENTS.BOOK).toBeDefined();
      expect(MOBILE_EVENTS.AUTHOR).toBeDefined();
      expect(MOBILE_EVENTS.CATEGORY).toBeDefined();
      expect(MOBILE_EVENTS.QUEUE).toBeDefined();
      expect(MOBILE_EVENTS.EXECUTOR).toBeDefined();
      expect(MOBILE_EVENTS.SYNC).toBeDefined();
      expect(MOBILE_EVENTS.NETWORK).toBeDefined();
      expect(MOBILE_EVENTS.APP).toBeDefined();
      expect(MOBILE_EVENTS.ERROR).toBeDefined();
    });

    it('should generate correct event names for CRUD operations', () => {
      expect(MOBILE_EVENTS.BOOK.CREATE.START).toBe('book.create.start');
      expect(MOBILE_EVENTS.BOOK.CREATE.SUCCESS).toBe('book.create.success');
      expect(MOBILE_EVENTS.BOOK.CREATE.FAILED).toBe('book.create.failed');
      
      expect(MOBILE_EVENTS.AUTHOR.UPDATE.START).toBe('author.update.start');
      expect(MOBILE_EVENTS.CATEGORY.DELETE.SUCCESS).toBe('category.delete.success');
    });

    it('should generate correct event names for queue operations', () => {
      expect(MOBILE_EVENTS.QUEUE.ENQUEUE).toBe('queue.enqueue');
      expect(MOBILE_EVENTS.QUEUE.PROCESS.START).toBe('queue.process.start');
      expect(MOBILE_EVENTS.QUEUE.PROCESS.COMPLETE).toBe('queue.process.complete');
      expect(MOBILE_EVENTS.QUEUE.RETRY).toBe('queue.retry');
      expect(MOBILE_EVENTS.QUEUE.FAILED).toBe('queue.failed');
    });

    it('should generate correct event names for sync operations', () => {
      expect(MOBILE_EVENTS.SYNC.START).toBe('sync.start');
      expect(MOBILE_EVENTS.SYNC.CONFLICT.DETECTED).toBe('sync.conflict.detected');
      expect(MOBILE_EVENTS.SYNC.ID_MAPPING.COMPLETE).toBe('sync.id_mapping.complete');
    });

    it('should generate correct event names for network events', () => {
      expect(MOBILE_EVENTS.NETWORK.ONLINE).toBe('network.online');
      expect(MOBILE_EVENTS.NETWORK.OFFLINE).toBe('network.offline');
      expect(MOBILE_EVENTS.NETWORK.TYPE_CHANGED).toBe('network.type_changed');
    });

    it('should generate correct event names for app lifecycle events', () => {
      expect(MOBILE_EVENTS.APP.FOREGROUND).toBe('app.foreground');
      expect(MOBILE_EVENTS.APP.BACKGROUND).toBe('app.background');
      expect(MOBILE_EVENTS.APP.SESSION.START).toBe('app.session.start');
    });

    it('should generate correct event names for error events', () => {
      expect(MOBILE_EVENTS.ERROR.UNHANDLED).toBe('error.unhandled');
      expect(MOBILE_EVENTS.ERROR.NETWORK_TIMEOUT).toBe('error.network_timeout');
      expect(MOBILE_EVENTS.ERROR.VALIDATION).toBe('error.validation');
    });

    it('should have wildcard ANY events for categories', () => {
      expect(MOBILE_EVENTS.BOOK.ANY).toBe('book.*');
      expect(MOBILE_EVENTS.QUEUE.ANY).toBe('queue.*');
      expect(MOBILE_EVENTS.ERROR.ANY).toBe('error.*');
    });
  });

  describe('Type Safety', () => {
    it('should provide type-safe event access', () => {
      // These should compile without TypeScript errors
      const bookCreateStart: string = MOBILE_EVENTS.BOOK.CREATE.START;
      const queueEnqueue: string = MOBILE_EVENTS.QUEUE.ENQUEUE;
      const networkOnline: string = MOBILE_EVENTS.NETWORK.ONLINE;
      
      expect(typeof bookCreateStart).toBe('string');
      expect(typeof queueEnqueue).toBe('string');
      expect(typeof networkOnline).toBe('string');
    });
  });

  describe('Event Naming Consistency', () => {
    it('should use lowercase dot-separated naming', () => {
      const allEvents = [
        MOBILE_EVENTS.BOOK.CREATE.START,
        MOBILE_EVENTS.AUTHOR.UPDATE.SUCCESS,
        MOBILE_EVENTS.CATEGORY.DELETE.FAILED,
        MOBILE_EVENTS.QUEUE.PROCESS.START,
        MOBILE_EVENTS.SYNC.CONFLICT.DETECTED,
        MOBILE_EVENTS.NETWORK.TYPE_CHANGED,
        MOBILE_EVENTS.APP.SESSION.START,
        MOBILE_EVENTS.ERROR.USER_FACING,
      ];

      allEvents.forEach(eventName => {
        expect(eventName).toMatch(/^[a-z0-9_]+(\.[a-z0-9_]+)*$/);
        expect(eventName).not.toContain(' ');
        expect(eventName).not.toContain('-');
        expect(eventName).not.toMatch(/[A-Z]/);
      });
    });
  });
});