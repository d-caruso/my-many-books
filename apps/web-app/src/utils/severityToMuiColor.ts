import type { Severity } from '@my-many-books/shared-types';

export type MuiChipColor = 'success' | 'warning' | 'error' | 'default';

export const severityToMuiColor = (severity: Severity): MuiChipColor => {
  switch (severity) {
    case 'neutral':
      return 'default';
    case 'success':
    case 'warning':
    case 'error':
      return severity;
  }
};

export type MuiLinearProgressColor = 'success' | 'warning' | 'error' | 'primary';

export const severityToMuiLinearProgressColor = (severity: Severity): MuiLinearProgressColor => {
  switch (severity) {
    case 'neutral':
      return 'primary';
    case 'success':
    case 'warning':
    case 'error':
      return severity;
  }
};

