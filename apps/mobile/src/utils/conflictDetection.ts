import type { Book } from '@/types';

/**
 * Detect if a book has a conflict with the server version
 */
export function hasConflict(localBook: Book, serverBook: Book): boolean {
  if (!localBook._serverUpdatedAt || !serverBook.updateDate) {
    return false;
  }

  // Check if server version was updated after our last known server state
  const localServerTimestamp = new Date(localBook._serverUpdatedAt).getTime();
  const serverTimestamp = new Date(serverBook.updateDate).getTime();

  return serverTimestamp > localServerTimestamp;
}

/**
 * Resolve conflict by choosing local or server version
 */
export function resolveConflict(
  localBook: Book,
  serverBook: Book,
  choice: 'local' | 'server'
): Book {
  if (choice === 'server') {
    // Use server version
    return {
      ...serverBook,
      _syncStatus: 'synced',
      _serverUpdatedAt: serverBook.updateDate,
    };
  } else {
    // Use local version (will be synced to server)
    return {
      ...localBook,
      _syncStatus: 'pending', // Will trigger re-sync
    };
  }
}
