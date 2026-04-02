import * as Clipboard from 'expo-clipboard';

import type { ExternalBookPrefill } from '@my-many-books/shared-types';
import { bookAPI } from '@/services/api';
import { ISBN_NOTICE, SCANNER_COPY_STATUS, type IsbnNotice, type ScannerCopyStatus } from '@/constants/scanner';

export type MobileIsbnScannerRoute =
  | {
      pathname: '/book/add';
      params: {
        isbn: string;
        scannerCopy: ScannerCopyStatus;
        prefill?: string;
        isbnNotice?: IsbnNotice;
      };
    }
  | {
      pathname: '/book/edit/[id]';
      params: {
        id: string;
        fromIsbnScan: '1';
        scannerCopy: ScannerCopyStatus;
      };
    };

export const serializeExternalBookPrefill = (prefill: ExternalBookPrefill): string =>
  encodeURIComponent(JSON.stringify(prefill));

export const deserializeExternalBookPrefill = (
  rawPrefill?: string | string[]
): ExternalBookPrefill | null => {
  const encodedPrefill = Array.isArray(rawPrefill) ? rawPrefill[0] : rawPrefill;

  if (!encodedPrefill) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(encodedPrefill)) as ExternalBookPrefill;
  } catch {
    return null;
  }
};

export async function resolveScannedIsbnRoute(isbn: string): Promise<MobileIsbnScannerRoute> {
  let scannerCopy: ScannerCopyStatus = SCANNER_COPY_STATUS.FAILED;

  try {
    await Clipboard.setStringAsync(isbn);
    scannerCopy = SCANNER_COPY_STATUS.SUCCESS;
  } catch {
    scannerCopy = SCANNER_COPY_STATUS.FAILED;
  }

  try {
    const result = await bookAPI.searchByISBN(isbn);

    if (result.found && !result.external) {
      return {
        pathname: '/book/edit/[id]',
        params: {
          id: String(result.book.id),
          fromIsbnScan: '1',
          scannerCopy,
        },
      };
    }

    if (result.found && result.external) {
      return {
        pathname: '/book/add',
        params: {
          isbn,
          scannerCopy,
          prefill: serializeExternalBookPrefill(result.book),
        },
      };
    }
  } catch {
    // Fall back to opening the add-book form with the scanned ISBN only.
  }

  return {
    pathname: '/book/add',
    params: {
      isbn,
      scannerCopy,
      isbnNotice: ISBN_NOTICE.VALID_NO_METADATA,
    },
  };
}
