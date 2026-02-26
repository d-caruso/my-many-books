import type { Book } from '@my-many-books/shared-types';
import type { SyncStatus } from './index';

export type EntityMeta = {
  tempId?: string;
  syncStatus?: SyncStatus;
  serverUpdatedAt?: string;
  serverId?: number;
  hasConflict?: boolean;
  rollbackData?: { previousValues?: Partial<Book> } | null;
};

export type UiBook = Book & { meta: EntityMeta };
