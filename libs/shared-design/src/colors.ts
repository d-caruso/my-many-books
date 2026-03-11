import { BookStatus } from '@my-many-books/shared-types';

/**
 * Canonical book status color palette.
 * Hex values are aligned with MUI default theme — web-app maps these to MUI
 * semantic names (primary, warning, success); other platforms use hex directly.
 *
 *   reading  → MUI primary.main  #1976D2
 *   paused   → MUI warning.main  #ED6C02
 *   finished → MUI success.main  #2E7D32
 *   none     → MUI grey[600]     #757575
 */
export const BOOK_STATUS_COLORS = {
  reading: '#1976D2',
  paused: '#ED6C02',
  finished: '#2E7D32',
  none: '#757575',
} as const;

export const getStatusColor = (status?: BookStatus): string => {
  switch (status) {
    case 'reading':
      return BOOK_STATUS_COLORS.reading;
    case 'paused':
      return BOOK_STATUS_COLORS.paused;
    case 'finished':
      return BOOK_STATUS_COLORS.finished;
    default:
      return BOOK_STATUS_COLORS.none;
  }
};

