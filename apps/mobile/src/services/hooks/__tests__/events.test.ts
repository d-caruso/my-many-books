import { HOOK_EVENTS } from '@my-many-books/shared-utils';

import { MOBILE_EVENTS } from '../eventsSchema';

describe('Mobile Events', () => {
  describe('Event Structure', () => {
    it('should have all required event categories', () => {
      expect(MOBILE_EVENTS.BOOK).toBeDefined();
      expect(MOBILE_EVENTS.AUTHOR).toBeDefined();
      expect(MOBILE_EVENTS.CATEGORY).toBeDefined();
      expect(MOBILE_EVENTS.SEARCH).toBeDefined();
      expect(MOBILE_EVENTS.SCANNER).toBeDefined();
      expect(MOBILE_EVENTS.USER).toBeDefined();
      expect(MOBILE_EVENTS.AUTH).toBeDefined();
      expect(MOBILE_EVENTS.QUEUE).toBeDefined();
      expect(MOBILE_EVENTS.EXECUTOR).toBeDefined();
      expect(MOBILE_EVENTS.SYNC).toBeDefined();
      expect(MOBILE_EVENTS.NETWORK).toBeDefined();
      expect(MOBILE_EVENTS.APP).toBeDefined();
      expect(MOBILE_EVENTS.ERROR).toBeDefined();
    });

    it('should generate correct event names for CRUD operations', () => {
      expect(MOBILE_EVENTS.BOOK.CREATE.BEFORE).toBe('book.create.before');
      expect(MOBILE_EVENTS.BOOK.CREATE.AFTER).toBe('book.create.after');
      expect(MOBILE_EVENTS.BOOK.CREATE.FAILURE).toBe('book.create.failure');
      
      expect(MOBILE_EVENTS.AUTHOR.UPDATE.BEFORE).toBe('author.update.before');
      expect(MOBILE_EVENTS.CATEGORY.DELETE.AFTER).toBe('category.delete.after');
      expect(MOBILE_EVENTS.SEARCH.QUERY).toBe('search.query');
      expect(MOBILE_EVENTS.SEARCH.RESULT_SELECTED).toBe('search.result_selected');
      expect(MOBILE_EVENTS.SCANNER.PERMISSION.REQUEST).toBe('scanner.permission.request');
      expect(MOBILE_EVENTS.SCANNER.ISBN.DETECTED).toBe('scanner.isbn.detected');
    });

    it('should compose shared mutation trees with local mobile infrastructure trees', () => {
      expect(MOBILE_EVENTS.BOOK.CREATE).toEqual(HOOK_EVENTS.BOOK.CREATE);
      expect(MOBILE_EVENTS.BOOK.STATUS.CHANGE).toEqual(HOOK_EVENTS.BOOK.STATUS.CHANGE);
      expect(MOBILE_EVENTS.AUTHOR.UPDATE).toEqual(HOOK_EVENTS.AUTHOR.UPDATE);
      expect(MOBILE_EVENTS.CATEGORY.DELETE).toEqual(HOOK_EVENTS.CATEGORY.DELETE);
      expect(MOBILE_EVENTS.USER.LOGIN).toEqual(HOOK_EVENTS.USER.LOGIN);
      expect(MOBILE_EVENTS.USER.PASSWORD.CHANGE).toEqual(HOOK_EVENTS.USER.PASSWORD.CHANGE);
      expect(MOBILE_EVENTS.AUTH.REFRESH).toEqual(HOOK_EVENTS.AUTH.REFRESH);
      expect(MOBILE_EVENTS.AUTH.VERIFY_EMAIL).toEqual(HOOK_EVENTS.AUTH.VERIFY_EMAIL);

      expect(MOBILE_EVENTS.SCANNER.COPY.SUCCESS).toBe('scanner.copy.success');
      expect(MOBILE_EVENTS.SCANNER.ROUTE_DECISION).toBe('scanner.route_decision');
      expect(MOBILE_EVENTS.QUEUE.PROCESS.START).toBe('queue.process.start');
      expect(MOBILE_EVENTS.SYNC.UPLOAD.COMPLETE).toBe('sync.upload.complete');
      expect(MOBILE_EVENTS.ERROR.API_RESPONSE).toBe('error.api_response');
      expect(MOBILE_EVENTS.AUTH.SESSION.EXPIRED).toBe('auth.session.expired');
    });

    it('should omit READ operations from the shared entity trees', () => {
      expect('READ' in MOBILE_EVENTS.BOOK).toBe(false);
      expect('READ' in MOBILE_EVENTS.AUTHOR).toBe(false);
      expect('READ' in MOBILE_EVENTS.CATEGORY).toBe(false);
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
      const bookCreateBefore: string = MOBILE_EVENTS.BOOK.CREATE.BEFORE;
      const queueEnqueue: string = MOBILE_EVENTS.QUEUE.ENQUEUE;
      const networkOnline: string = MOBILE_EVENTS.NETWORK.ONLINE;
      
      expect(typeof bookCreateBefore).toBe('string');
      expect(typeof queueEnqueue).toBe('string');
      expect(typeof networkOnline).toBe('string');
    });
  });

  describe('Event Naming Consistency', () => {
    it('should use lowercase dot-separated naming', () => {
      const allEvents = [
        MOBILE_EVENTS.BOOK.CREATE.BEFORE,
        MOBILE_EVENTS.AUTHOR.UPDATE.AFTER,
        MOBILE_EVENTS.CATEGORY.DELETE.FAILURE,
        MOBILE_EVENTS.USER.LOGIN.AFTER,
        MOBILE_EVENTS.AUTH.SESSION.EXPIRED,
        MOBILE_EVENTS.SEARCH.RESULT_SELECTED,
        MOBILE_EVENTS.SCANNER.PERMISSION.GRANTED,
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
