import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookAPI } from '../api';
import { bookRepository } from '../database/BookRepository';
import { idMappingService } from './IDMappingService';
import { operationQueue } from '../OperationQueue';
import { databaseService } from '../database/DatabaseService';
import { executeOperation } from '../QueueExecutor';
import { Book } from '../../types';

const LAST_SYNC_KEY = '@last_sync_timestamp';
const SYNC_PAGE_SIZE = 50;

/**
 * Bidirectional Sync Service (Phase 5 - Task 5.4)
 *
 * Handles synchronization between mobile SQLite and server database.
 * Implements pull sync (server → mobile) and push sync (mobile → server).
 */
export class SyncService {
  private isSyncing = false;

  /**
   * Get last successful sync timestamp
   */
  async getLastSyncTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_SYNC_KEY);
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return null;
    }
  }

  /**
   * Set last successful sync timestamp
   */
  async setLastSyncTime(timestamp: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, timestamp);
      console.log(`Last sync time updated: ${timestamp}`);
    } catch (error) {
      console.error('Failed to set last sync time:', error);
    }
  }

  /**
   * Perform full bidirectional sync
   * Task 5.4: Pull from server + Push to server
   */
  async performSync(): Promise<{ pulled: number; pushed: number; errors: number }> {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping');
      return { pulled: 0, pushed: 0, errors: 0 };
    }

    this.isSyncing = true;
    let pulledCount = 0;
    let pushedCount = 0;
    let errorCount = 0;

    try {
      console.log('Starting bidirectional sync...');

      // Step 1: Push pending changes to server (Task 5.4.2)
      try {
        pushedCount = await this.pushToServer();
        console.log(`Pushed ${pushedCount} operations to server`);
      } catch (error) {
        console.error('Push sync failed:', error);
        errorCount++;
      }

      // Step 2: Pull changes from server (Task 5.4.1)
      try {
        pulledCount = await this.pullFromServer();
        console.log(`Pulled ${pulledCount} books from server`);
      } catch (error) {
        console.error('Pull sync failed:', error);
        errorCount++;
      }

      // Step 3: Update last sync time (Task 5.4.3)
      if (errorCount === 0) {
        await this.setLastSyncTime(new Date().toISOString());
      }

      // Step 4: Perform cleanup after successful sync (Phase 5 fix)
      try {
        const { cleanupService } = await import('./CleanupService');
        const cleanupResult = await cleanupService.performFullCleanup();
        console.log(`Cleanup completed:`, cleanupResult);
      } catch (error) {
        console.error('Cleanup failed:', error);
      }

      console.log(`Sync complete: pulled=${pulledCount}, pushed=${pushedCount}, errors=${errorCount}`);
      return { pulled: pulledCount, pushed: pushedCount, errors: errorCount };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Pull changes from server (Task 5.4.1: Server → Mobile Sync)
   *
   * Flow:
   * 1. Fetch books from server (with pagination)
   * 2. For each book:
   *    - Check if exists locally by server_id
   *    - If exists: compare updateDate, keep newer
   *    - If not exists: INSERT with id=String(serverId), server_id=serverId
   * 3. Register ID mappings for new books
   */
  async pullFromServer(): Promise<number> {
    let totalPulled = 0;
    let page = 1;
    let hasMore = true;

    const lastSyncTime = await this.getLastSyncTime();
    console.log(`Pull sync starting (last sync: ${lastSyncTime || 'never'})`);

    while (hasMore) {
      try {
        // Fetch books from server with pagination
        const queryParams: any = {
          limit: SYNC_PAGE_SIZE,
          offset: (page - 1) * SYNC_PAGE_SIZE,
        };
        
        // Add incremental sync parameter if we have last sync time
        if (lastSyncTime) {
          queryParams.updatedSince = lastSyncTime;
        }
        
        const response: any = await bookAPI.getBooks(queryParams);

        const serverBooks = response.books || response.data || response;
        const booksArray = Array.isArray(serverBooks) ? serverBooks : [];

        console.log(`Fetched page ${page}: ${booksArray.length} books`);

        for (const serverBook of booksArray) {
          try {
            await this.mergeServerBook(serverBook);
            totalPulled++;
          } catch (error) {
            console.error(`Failed to merge book ${serverBook.id}:`, error);
          }
        }

        // Check if there are more pages
        hasMore = booksArray.length === SYNC_PAGE_SIZE;
        page++;
      } catch (error) {
        console.error(`Failed to fetch page ${page}:`, error);
        throw error;
      }
    }

    return totalPulled;
  }

  /**
   * Merge a server book into local database
   * Handles conflict resolution based on updateDate
   */
  private async mergeServerBook(serverBook: any): Promise<void> {
    const serverId = serverBook.id;

    // Check if book exists locally by server_id
    const localBook = await bookRepository.findByServerId(serverId);

    if (localBook) {
      // Book exists locally - compare updateDate
      const serverUpdateDate = new Date(serverBook.updateDate || serverBook.updatedAt);
      const localUpdateDate = new Date(localBook.updateDate);

      if (serverUpdateDate > localUpdateDate) {
        // Server version is newer - update local
        console.log(`Updating local book ${localBook.id} with server changes`);
        await bookRepository.update(localBook.id, {
          ...this.mapServerBookToLocal(serverBook),
          serverId, // Preserve server_id
        });
      } else {
        console.log(`Local book ${localBook.id} is up-to-date or newer`);
      }
    } else {
      // Book doesn't exist locally - insert new
      const newBook = this.mapServerBookToLocal(serverBook);

      // Use server ID as local ID (converted to string)
      const localId = String(serverId);

      console.log(`Inserting new book from server: ${localId} (server_id: ${serverId})`);

      await bookRepository.create({
        ...newBook,
        id: localId,
        serverId,
      });

      // Register ID mapping
      await idMappingService.registerTempId(localId, serverId, 'book');
    }
  }

  /**
   * Map server book format to local Book format
   */
  private mapServerBookToLocal(serverBook: any): Partial<Book> {
    return {
      title: serverBook.title,
      status: serverBook.status,
      thumbnail: serverBook.thumbnail,
      description: serverBook.description,
      publishedDate: serverBook.publishedDate || serverBook.published_date,
      pageCount: serverBook.pageCount || serverBook.page_count,
      rating: serverBook.rating,
      notes: serverBook.notes,
      creationDate: serverBook.creationDate || serverBook.created_at || new Date().toISOString(),
      updateDate: serverBook.updateDate || serverBook.updated_at || new Date().toISOString(),
      _syncStatus: 'synced',
      _serverUpdatedAt: serverBook.updateDate || serverBook.updated_at || new Date().toISOString(),
    };
  }

  /**
   * Push pending changes to server (Task 5.4.2: Mobile → Server Sync)
   *
   * Process the operation queue to send pending changes to server.
   * This is already handled by Phase 2 queue, we just trigger it here.
   */
  async pushToServer(): Promise<number> {
    const pendingOps = operationQueue.getPendingOperations();
    const pendingCount = pendingOps.length;

    if (pendingCount === 0) {
      console.log('No pending operations to push');
      return 0;
    }

    console.log(`Pushing ${pendingCount} pending operations to server`);

    // Process the queue (already implemented in Phase 2)
    // The queue will handle ID mapping via QueueExecutor (Task 5.3)
    await operationQueue.processQueue(executeOperation);

    // Do NOT blindly mark all pending as synced - the queue executor handles
    // individual operation success/failure status updates properly.
    // This prevents hiding failed operations that need to be retried.

    return pendingCount;
  }

  /**
   * Check if sync is currently running
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Perform incremental sync (only changes since last sync)
   */
  async performIncrementalSync(): Promise<{ pulled: number; pushed: number; errors: number }> {
    // Use the same logic as performSync, but lastSyncTime will filter server results
    return this.performSync();
  }
}

// Singleton instance
export const syncService = new SyncService();
