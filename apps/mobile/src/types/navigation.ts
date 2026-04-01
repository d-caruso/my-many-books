import { Book } from '@/types';
import type { ScannerCopyStatus } from '@/constants/scanner';

export type RootStackParamList = {
  '(tabs)': undefined;
  auth: undefined;
  'book/[id]': { id: string };
  'book/edit/[id]': { id: string; fromIsbnScan?: '1'; scannerCopy?: ScannerCopyStatus };
  'book/add': { isbn?: string; bookData?: string; prefill?: string; scannerCopy?: ScannerCopyStatus; isbnNotice?: 'valid_no_metadata' };
  scanner: undefined;
};

export type TabParamList = {
  index: undefined;
  search: undefined;
  scanner: undefined;
  profile: undefined;
};

export type BookStackParamList = {
  details: { book: Book };
  edit: { book: Book };
  add: { isbn?: string; bookData?: string; prefill?: string; scannerCopy?: ScannerCopyStatus; isbnNotice?: 'valid_no_metadata' };
};
