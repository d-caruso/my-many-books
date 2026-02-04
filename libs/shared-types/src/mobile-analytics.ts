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

interface MobileAnalyticsBreakdown {
  attempted: number;
  successful: number;
  failed: number;
  successRate: number;
  errorRate: number;
}

export interface MobileAnalyticsEventTypeBreakdown extends MobileAnalyticsBreakdown {
  eventType: string;
}

export interface MobileAnalyticsActionTypeBreakdown extends MobileAnalyticsBreakdown {
  actionType: string;
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
  generatedAt: string;
}
