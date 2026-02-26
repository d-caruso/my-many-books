export const SCANNER_COPY_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

export type ScannerCopyStatus = typeof SCANNER_COPY_STATUS[keyof typeof SCANNER_COPY_STATUS];
