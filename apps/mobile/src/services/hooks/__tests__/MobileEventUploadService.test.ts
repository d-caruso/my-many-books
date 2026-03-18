import {
  MobileEventUploadService,
  type StorageAdapter,
  type UploadHttpClient,
} from '../MobileEventUploadService';
import {
  HOOK_LISTENER_CATEGORIES,
  HOOK_LISTENER_CATEGORIES_STORAGE_KEYS,
} from '@my-many-books/shared-types';

type StorageState = Partial<Record<string, string>>;

const createStorageMock = (initialState: StorageState = {}) => {
  const state = new Map<string, string | null>(
    Object.entries(initialState).map(([key, value]) => [key, value ?? null])
  );

  const storage: jest.Mocked<StorageAdapter> = {
    getItem: jest.fn(async (key: string) => state.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      state.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      state.delete(key);
    }),
  };

  return { state, storage };
};

describe('MobileEventUploadService', () => {
  const resolveUserId = jest.fn<Promise<string | undefined>, []>();
  const resolveAppMetadata = jest.fn(() => ({
    appVersion: '9.9.9',
    deviceInfo: {
      platform: 'ios',
      platformVersion: '18.0',
    },
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    resolveUserId.mockResolvedValue('user-123');
  });

  it('uploads stored events from all listener buckets and clears uploaded buckets on success', async () => {
    const analyticsKey = HOOK_LISTENER_CATEGORIES_STORAGE_KEYS[HOOK_LISTENER_CATEGORIES.ANALYTICS];
    const errorKey = HOOK_LISTENER_CATEGORIES_STORAGE_KEYS[HOOK_LISTENER_CATEGORIES.ERROR_REPORTING];
    const { storage } = createStorageMock({
      [analyticsKey]: JSON.stringify([
        {
          eventType: 'book.create.after',
          timestamp: '2026-03-18T10:00:00.000Z',
          data: { bookId: 'book-1' },
          category: 'user_behavior',
        },
      ]),
      [errorKey]: JSON.stringify([
        {
          eventType: 'error.unhandled',
          timestamp: '2026-03-18T10:01:00.000Z',
          data: { message: 'boom' },
          severity: 'critical',
        },
      ]),
    });
    const httpClient: jest.Mocked<UploadHttpClient> = {
      post: jest.fn().mockResolvedValue({
        processed: 2,
        failed: 0,
        errors: [],
      }),
    };
    const service = new MobileEventUploadService(storage, httpClient, resolveUserId, resolveAppMetadata);

    const result = await service.uploadStoredEvents({ trigger: 'sync' });

    expect(httpClient.post).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/mobile-analytics/events/batch',
      {
        events: [
          {
            event_type: 'book.create.after',
            timestamp: '2026-03-18T10:00:00.000Z',
            data: { category: 'user_behavior', bookId: 'book-1' },
            user_id: 'user-123',
            app_version: '9.9.9',
            device_info: { platform: 'ios', platformVersion: '18.0' },
          },
          {
            event_type: 'error.unhandled',
            timestamp: '2026-03-18T10:01:00.000Z',
            data: { severity: 'critical', message: 'boom' },
            user_id: 'user-123',
            app_version: '9.9.9',
            device_info: { platform: 'ios', platformVersion: '18.0' },
          },
        ],
      }
    );
    expect(storage.removeItem).toHaveBeenCalledWith(analyticsKey);
    expect(storage.removeItem).toHaveBeenCalledWith(errorKey);
    expect(result).toEqual({
      totalLoaded: 2,
      uploaded: 2,
      remaining: 0,
    });
  });

  it('clears only successfully uploaded events on partial success', async () => {
    const analyticsKey = HOOK_LISTENER_CATEGORIES_STORAGE_KEYS[HOOK_LISTENER_CATEGORIES.ANALYTICS];
    const performanceKey =
      HOOK_LISTENER_CATEGORIES_STORAGE_KEYS[HOOK_LISTENER_CATEGORIES.PERFORMANCE_MONITORING];
    const analyticsEvents = [
      {
        eventType: 'book.create.after',
        timestamp: '2026-03-18T10:00:00.000Z',
        data: { bookId: 'book-1' },
      },
      {
        eventType: 'book.update.after',
        timestamp: '2026-03-18T10:01:00.000Z',
        data: { bookId: 'book-2' },
      },
    ];
    const performanceEvents = [
      {
        eventType: 'sync.performance_metric',
        timestamp: '2026-03-18T10:02:00.000Z',
        data: { duration: 1200 },
      },
    ];
    const { storage } = createStorageMock({
      [analyticsKey]: JSON.stringify(analyticsEvents),
      [performanceKey]: JSON.stringify(performanceEvents),
    });
    const httpClient: jest.Mocked<UploadHttpClient> = {
      post: jest.fn().mockResolvedValue({
        processed: 2,
        failed: 1,
        errors: [{ index: 1, error: 'validation failed' }],
      }),
    };
    const service = new MobileEventUploadService(storage, httpClient, resolveUserId, resolveAppMetadata);

    const result = await service.uploadStoredEvents({ trigger: 'sync' });

    expect(storage.setItem).toHaveBeenCalledWith(analyticsKey, JSON.stringify([analyticsEvents[1]]));
    expect(storage.removeItem).toHaveBeenCalledWith(performanceKey);
    expect(result).toEqual({
      totalLoaded: 3,
      uploaded: 2,
      remaining: 1,
    });
  });

  it('keeps stored events when the batch upload fails', async () => {
    const analyticsKey = HOOK_LISTENER_CATEGORIES_STORAGE_KEYS[HOOK_LISTENER_CATEGORIES.ANALYTICS];
    const analyticsEvents = [
      {
        eventType: 'book.create.after',
        timestamp: '2026-03-18T10:00:00.000Z',
        data: { bookId: 'book-1' },
      },
    ];
    const { storage } = createStorageMock({
      [analyticsKey]: JSON.stringify(analyticsEvents),
    });
    const httpClient: jest.Mocked<UploadHttpClient> = {
      post: jest.fn().mockRejectedValue(new Error('network down')),
    };
    const service = new MobileEventUploadService(storage, httpClient, resolveUserId, resolveAppMetadata);

    const result = await service.uploadStoredEvents({ trigger: 'network_restored' });

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(result).toEqual({
      totalLoaded: 1,
      uploaded: 0,
      remaining: 1,
    });
  });

  it('splits uploads into batches of 100 events', async () => {
    const analyticsKey = HOOK_LISTENER_CATEGORIES_STORAGE_KEYS[HOOK_LISTENER_CATEGORIES.ANALYTICS];
    const analyticsEvents = Array.from({ length: 101 }, (_, index) => ({
      eventType: 'book.create.after',
      timestamp: `2026-03-18T10:${String(index).padStart(2, '0')}:00.000Z`,
      data: { index },
    }));
    const { storage } = createStorageMock({
      [analyticsKey]: JSON.stringify(analyticsEvents),
    });
    const httpClient: jest.Mocked<UploadHttpClient> = {
      post: jest
        .fn()
        .mockResolvedValueOnce({ processed: 100, failed: 0, errors: [] })
        .mockResolvedValueOnce({ processed: 1, failed: 0, errors: [] }),
    };
    const service = new MobileEventUploadService(storage, httpClient, resolveUserId, resolveAppMetadata);

    const result = await service.uploadStoredEvents({ trigger: 'sync' });

    expect(httpClient.post).toHaveBeenCalledTimes(2);
    expect((httpClient.post.mock.calls[0][1] as { events: unknown[] }).events).toHaveLength(100);
    expect((httpClient.post.mock.calls[1][1] as { events: unknown[] }).events).toHaveLength(1);
    expect(result).toEqual({
      totalLoaded: 101,
      uploaded: 101,
      remaining: 0,
    });
  });
});
