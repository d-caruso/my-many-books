import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../../config/api';
import {
  HOOK_LISTENER_CATEGORIES,
  HOOK_LISTENER_CATEGORIES_STORAGE_KEYS,
  type HookListenerCategory,
} from '@my-many-books/shared-types';
import packageJson from '../../../package.json';

type StoredHookEvent = {
  eventType?: string;
  timestamp?: string;
  data?: unknown;
  [key: string]: unknown;
};

type MobileAnalyticsEventPayload = {
  event_type: string;
  timestamp: string;
  data: Record<string, unknown>;
  user_id?: string;
  app_version?: string;
  device_info?: Record<string, unknown>;
};

type BatchUploadResponse = {
  processed?: number;
  failed?: number;
  errors?: { index?: number; error?: string }[];
  timestamp?: string;
};

type UploadQueueEntry = {
  localKey: string;
  category: HookListenerCategory;
  rawEvent: StoredHookEvent;
  payload: MobileAnalyticsEventPayload;
};

type AppMetadata = {
  appVersion?: string;
  deviceInfo: Record<string, unknown>;
};

export interface MobileEventUploadResult {
  totalLoaded: number;
  uploaded: number;
  remaining: number;
}

export interface UploadContext {
  trigger: 'network_restored' | 'sync';
}

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface UploadHttpClient {
  post<T>(url: string, data?: unknown): Promise<T>;
}

const BATCH_SIZE = 100;
const MOBILE_ANALYTICS_BATCH_ENDPOINT = `${API_BASE_URL}/mobile-analytics/events/batch`;
const HOOK_EVENT_STORAGE_CATEGORIES: HookListenerCategory[] = [
  HOOK_LISTENER_CATEGORIES.ANALYTICS,
  HOOK_LISTENER_CATEGORIES.ERROR_REPORTING,
  HOOK_LISTENER_CATEGORIES.OFFLINE_STORAGE,
  HOOK_LISTENER_CATEGORIES.PERFORMANCE_MONITORING,
];

const getAuthService = async () => {
  const authModule = await import('../authService');
  return authModule.authService;
};

const defaultResolveUserId = async (): Promise<string | undefined> => {
  try {
    const authService = await getAuthService();
    const user = await authService.getCurrentUser();
    return user?.id != null ? String(user.id) : undefined;
  } catch {
    return undefined;
  }
};

const defaultResolveAppMetadata = (): AppMetadata => ({
  appVersion: Constants.expoConfig?.version || packageJson.version,
  deviceInfo: {
    platform: Platform.OS,
    platformVersion: Platform.Version,
    executionEnvironment: Constants.executionEnvironment ?? 'unknown',
  },
});

export class MobileEventUploadService {
  private inFlightUpload: Promise<MobileEventUploadResult> | null = null;
  private resolvedHttpClient: UploadHttpClient | null = null;

  constructor(
    private readonly storage: StorageAdapter = AsyncStorage,
    private readonly injectedHttpClient?: UploadHttpClient,
    private readonly resolveUserId: () => Promise<string | undefined> = defaultResolveUserId,
    private readonly resolveAppMetadata: () => AppMetadata = defaultResolveAppMetadata,
  ) {}

  async uploadStoredEvents(_context: UploadContext): Promise<MobileEventUploadResult> {
    if (this.inFlightUpload) {
      return this.inFlightUpload;
    }

    const uploadPromise = this.performUpload().finally(() => {
      this.inFlightUpload = null;
    });

    this.inFlightUpload = uploadPromise;
    return uploadPromise;
  }

  private async performUpload(): Promise<MobileEventUploadResult> {
    const userId = await this.resolveUserId();
    const appMetadata = this.resolveAppMetadata();
    const pendingByCategory = await this.loadPendingEntries(userId, appMetadata);
    const allEntries = HOOK_EVENT_STORAGE_CATEGORIES.flatMap((category) => pendingByCategory[category]);

    if (allEntries.length === 0) {
      return {
        totalLoaded: 0,
        uploaded: 0,
        remaining: 0,
      };
    }

    let uploadedCount = 0;

    for (let start = 0; start < allEntries.length; start += BATCH_SIZE) {
      const batchEntries = allEntries.slice(start, start + BATCH_SIZE);

      try {
        const response = await this.uploadBatch(batchEntries.map((entry) => entry.payload));
        const failedIndexes = this.getFailedIndexes(response, batchEntries.length);
        const successfulEntries = batchEntries.filter((_, index) => !failedIndexes.has(index));

        if (successfulEntries.length === 0) {
          continue;
        }

        uploadedCount += successfulEntries.length;
        await this.removeUploadedEntries(pendingByCategory, successfulEntries);
      } catch (error) {
        if (__DEV__) {
          console.warn('[MobileEventUploadService] Failed to upload stored events:', error);
        }
        break;
      }
    }

    const remaining = HOOK_EVENT_STORAGE_CATEGORIES.reduce(
      (count, category) => count + pendingByCategory[category].length,
      0
    );

    return {
      totalLoaded: allEntries.length,
      uploaded: uploadedCount,
      remaining,
    };
  }

  private async loadPendingEntries(
    userId: string | undefined,
    appMetadata: AppMetadata
  ): Promise<Record<HookListenerCategory, UploadQueueEntry[]>> {
    const pendingEntries = {} as Record<HookListenerCategory, UploadQueueEntry[]>;

    for (const category of HOOK_EVENT_STORAGE_CATEGORIES) {
      const storageKey = HOOK_LISTENER_CATEGORIES_STORAGE_KEYS[category];
      const serializedEvents = await this.storage.getItem(storageKey);
      const parsedEvents = this.parseStoredEvents(serializedEvents);

      pendingEntries[category] = parsedEvents.map((rawEvent, index) => ({
        localKey: `${category}:${index}`,
        category,
        rawEvent,
        payload: this.toApiPayload(rawEvent, userId, appMetadata),
      }));
    }

    return pendingEntries;
  }

  private parseStoredEvents(serializedEvents: string | null): StoredHookEvent[] {
    if (!serializedEvents) {
      return [];
    }

    try {
      const parsed = JSON.parse(serializedEvents);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(
        (value): value is StoredHookEvent => typeof value === 'object' && value !== null && !Array.isArray(value)
      );
    } catch {
      return [];
    }
  }

  private toApiPayload(
    storedEvent: StoredHookEvent,
    userId: string | undefined,
    appMetadata: AppMetadata
  ): MobileAnalyticsEventPayload {
    const { eventType, timestamp, data, ...metadata } = storedEvent;

    return {
      event_type: typeof eventType === 'string' && eventType ? eventType : 'unknown',
      timestamp: typeof timestamp === 'string' && timestamp ? timestamp : new Date().toISOString(),
      data: {
        ...this.normalizeObject(metadata),
        ...this.normalizeData(data),
      },
      ...(userId ? { user_id: userId } : {}),
      ...(appMetadata.appVersion ? { app_version: appMetadata.appVersion } : {}),
      device_info: appMetadata.deviceInfo,
    };
  }

  private normalizeData(data: unknown): Record<string, unknown> {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }

    if (Array.isArray(data)) {
      return { items: data };
    }

    if (data === undefined) {
      return {};
    }

    return { value: data };
  }

  private normalizeObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private async uploadBatch(events: MobileAnalyticsEventPayload[]): Promise<BatchUploadResponse> {
    const client = await this.getHttpClient();
    return client.post<BatchUploadResponse>(MOBILE_ANALYTICS_BATCH_ENDPOINT, { events });
  }

  private getFailedIndexes(response: BatchUploadResponse, batchSize: number): Set<number> {
    const explicitFailures = Array.isArray(response.errors)
      ? response.errors
          .map((error) => error.index)
          .filter((index): index is number => Number.isInteger(index) && index >= 0 && index < batchSize)
      : [];

    if (explicitFailures.length > 0) {
      return new Set(explicitFailures);
    }

    if ((response.failed ?? 0) === 0 && (response.processed ?? 0) === batchSize) {
      return new Set<number>();
    }

    return new Set(Array.from({ length: batchSize }, (_, index) => index));
  }

  private async removeUploadedEntries(
    pendingByCategory: Record<HookListenerCategory, UploadQueueEntry[]>,
    successfulEntries: UploadQueueEntry[]
  ): Promise<void> {
    const uploadedKeysByCategory = new Map<HookListenerCategory, Set<string>>();

    for (const entry of successfulEntries) {
      if (!uploadedKeysByCategory.has(entry.category)) {
        uploadedKeysByCategory.set(entry.category, new Set<string>());
      }

      uploadedKeysByCategory.get(entry.category)?.add(entry.localKey);
    }

    for (const [category, uploadedKeys] of uploadedKeysByCategory.entries()) {
      pendingByCategory[category] = pendingByCategory[category].filter((entry) => !uploadedKeys.has(entry.localKey));

      const storageKey = HOOK_LISTENER_CATEGORIES_STORAGE_KEYS[category];
      const remainingEvents = pendingByCategory[category].map((entry) => entry.rawEvent);

      if (remainingEvents.length === 0) {
        await this.storage.removeItem(storageKey);
      } else {
        await this.storage.setItem(storageKey, JSON.stringify(remainingEvents));
      }
    }
  }

  private async getHttpClient(): Promise<UploadHttpClient> {
    if (this.injectedHttpClient) {
      return this.injectedHttpClient;
    }

    if (this.resolvedHttpClient) {
      return this.resolvedHttpClient;
    }

    try {
      const apiModule = await import('../api');
      if (apiModule.apiHttpClient) {
        this.resolvedHttpClient = apiModule.apiHttpClient as UploadHttpClient;
        return this.resolvedHttpClient;
      }
    } catch {
      // Fall through to a local fetch-based client.
    }

    this.resolvedHttpClient = {
      post: this.postWithFetch.bind(this),
    };

    return this.resolvedHttpClient;
  }

  private async postWithFetch<T>(url: string, data?: unknown): Promise<T> {
    const authService = await getAuthService();
    const token = await authService.getIdToken();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (payload && typeof payload === 'object' && 'success' in payload) {
      const envelope = payload as { success?: unknown; data?: T };
      if (envelope.success === true && 'data' in envelope) {
        return envelope.data as T;
      }
    }

    return payload as T;
  }
}

export const mobileEventUploadService = new MobileEventUploadService();
