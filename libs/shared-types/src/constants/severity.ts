/**
 * UI-agnostic severity levels shared across platforms.
 *
 * Use for health/status indicators, alerts, and any
 * "good / degraded / bad / unknown" UI state.
 *
 * Apps map this to their framework's color system at the boundary:
 *   - Web (MUI): 'success' | 'warning' | 'error' | 'default'
 *   - Mobile (Paper): theme colors / component props
 */
export const SEVERITY = Object.freeze({
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  NEUTRAL: 'neutral',
} as const);

export type Severity = typeof SEVERITY[keyof typeof SEVERITY];
