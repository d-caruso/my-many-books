import type { HealthStatus } from './constants/health-status';

export interface MobileAnalyticsTimeSeriesPoint {
  bucketStart: string;
  processed: number;
  failed: number;
  total: number;
}

export interface MobileAnalyticsEventTypeCount {
  eventType: string;
  count: number;
}

export interface MobileAnalyticsEventTypeBreakdown {
  eventType: string;
  attempted: number;
  successful: number;
  failed: number;
  successRate: number;
  errorRate: number;
}

export interface MobileAnalyticsActionTypeBreakdown {
  actionType: string;
  attempted: number;
  successful: number;
  failed: number;
  successRate: number;
  errorRate: number;
}

export interface MobileAnalyticsStats {
  eventsProcessedToday: number;
  eventsProcessedTotal: number;
  failedEventsTotal: number;
  errorRate: number;
  avgProcessingTimeMs: number;
  topEventTypes: MobileAnalyticsEventTypeCount[];
  eventTypeBreakdown: MobileAnalyticsEventTypeBreakdown[];
  lastProcessed: string | null;
  systemStatus: HealthStatus;
  timeSeries: MobileAnalyticsTimeSeriesPoint[];
  actionTypeBreakdown: MobileAnalyticsActionTypeBreakdown[];
  generatedAt: string;
}
