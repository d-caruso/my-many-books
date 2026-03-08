/**
 * Mobile analytics processing status enum values
 */
export const MOBILE_ANALYTICS_PROCESSING_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSED: 'processed',
  FAILED: 'failed',
} as const);

/**
 * Array of all processing status values (derived from MOBILE_ANALYTICS_PROCESSING_STATUS)
 * Used for validation schemas and database enums.
 */
export const MOBILE_ANALYTICS_PROCESSING_STATUSES = Object.freeze(
  Object.values(MOBILE_ANALYTICS_PROCESSING_STATUS)
);

/**
 * Type exports
 */
export type MobileAnalyticsProcessingStatus = typeof MOBILE_ANALYTICS_PROCESSING_STATUSES[number];
