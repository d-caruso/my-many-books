export const SCANNER_COPY_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

export type ScannerCopyStatus = typeof SCANNER_COPY_STATUS[keyof typeof SCANNER_COPY_STATUS];

export const ISBN_NOTICE = {
  VALID_NO_METADATA: 'valid_no_metadata',
} as const;

export type IsbnNotice = typeof ISBN_NOTICE[keyof typeof ISBN_NOTICE];
