import type { Book, Author, Category } from '@my-many-books/shared-types';
import { LocalBook } from '@/entities/LocalBook';
import { LocalAuthor } from '@/entities/LocalAuthor';
import { LocalCategory } from '@/entities/LocalCategory';
import { SYNC_STATUS } from '@/types';

/**
 * Generic conflict detection function for backwards compatibility
 * Alias for hasBookConflict
 */
export function hasConflict(localBook: LocalBook, serverBook: Book): boolean {
  return hasBookConflict(localBook, serverBook);
}

/**
 * Detect if a book has a conflict with the server version
 */
export function hasBookConflict(localBook: LocalBook, serverBook: Pick<Book, 'updateDate'>): boolean {
  if (!localBook.serverUpdatedAt || !serverBook.updateDate) {
    return false;
  }

  const localServerTimestamp = new Date(localBook.serverUpdatedAt).getTime();
  const serverTimestamp = new Date(serverBook.updateDate).getTime();

  return serverTimestamp > localServerTimestamp;
}

/**
 * Resolve conflict by choosing local or server version
 */
export function resolveConflict(
  localBook: LocalBook,
  serverBook: Book,
  choice: 'local' | 'server'
): LocalBook {
  if (choice === 'server') {
    const resolved = new LocalBook(serverBook);
    resolved.syncStatus = SYNC_STATUS.SYNCED;
    resolved.serverUpdatedAt = serverBook.updateDate;
    return resolved;
  } else {
    localBook.syncStatus = SYNC_STATUS.PENDING;
    return localBook;
  }
}

/**
 * Detect if an author has a conflict with the server version
 */
export function hasAuthorConflict(localAuthor: LocalAuthor, serverAuthor: Pick<Author, 'updateDate'>): boolean {
  if (!localAuthor.serverUpdatedAt || !serverAuthor.updateDate) {
    return false;
  }

  const localServerTimestamp = new Date(localAuthor.serverUpdatedAt).getTime();
  const serverTimestamp = new Date(serverAuthor.updateDate).getTime();

  return serverTimestamp > localServerTimestamp;
}

/**
 * Detect if a category has a conflict with the server version
 */
export function hasCategoryConflict(localCategory: LocalCategory, serverCategory: Pick<Category, 'updateDate'>): boolean {
  if (!localCategory.serverUpdatedAt || !serverCategory.updateDate) {
    return false;
  }

  const localServerTimestamp = new Date(localCategory.serverUpdatedAt).getTime();
  const serverTimestamp = new Date(serverCategory.updateDate).getTime();

  return serverTimestamp > localServerTimestamp;
}
