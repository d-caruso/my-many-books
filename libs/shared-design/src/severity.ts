/**
 * UI-agnostic severity levels shared across platforms.
 *
 * These are intentionally framework-agnostic (not MUI / RN specific).
 */

import { designTokens } from './tokens';

export const SEVERITY = Object.freeze({
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  NEUTRAL: 'neutral',
} as const);

export type Severity = typeof SEVERITY[keyof typeof SEVERITY];

export const severityToHex = (severity: Severity): string => {
  switch (severity) {
    case SEVERITY.SUCCESS:
      return designTokens.colors.semantic.success;
    case SEVERITY.WARNING:
      return designTokens.colors.semantic.warning;
    case SEVERITY.ERROR:
      return designTokens.colors.semantic.error;
    case SEVERITY.NEUTRAL:
      return designTokens.colors.neutral[500];
  }
};

