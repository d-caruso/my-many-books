// ================================================================
// libs/shared-types/src/constants/health-status.ts
// Health Status Constants
// ================================================================

export const HEALTH_STATUS = Object.freeze({
    HEALTHY: 'healthy',
    DEGRADED: 'degraded',
    DISABLED: 'disabled',
    ERROR: 'error',
} as const);

export type HealthStatus = typeof HEALTH_STATUS[keyof typeof HEALTH_STATUS];