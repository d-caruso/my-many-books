import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookAPI, authorAPI, categoryAPI } from '../api';
import { bookRepository } from '../database/BookRepository';
import { authorRepository } from '../database/AuthorRepository';
import { categoryRepository } from '../database/CategoryRepository';
import { idMappingService } from './IDMappingService';
import { operationQueue } from '../OperationQueue';
import { databaseService } from '../database/DatabaseService';
import { executeOperation } from '../QueueExecutor';
import { Book } from '../../types';
import { hasBookConflict, hasAuthorConflict, hasCategoryConflict } from '../../utils/conflictDetection';

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
        const booksPulled = await this.pullBooksFromServer();
        const authorsPulled = await this.pullAuthorsFromServer();
        const categoriesPulled = await this.pullCategoriesFromServer();
        pulledCount = booksPulled + authorsPulled + categoriesPulled;
        console.log(`Pulled ${booksPulled} books, ${authorsPulled} authors, ${categoriesPulled} categories from server`);
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
   * Pull books from server (Task 5.4.1: Server → Mobile Sync)
   *
   * Flow:
   * 1. Fetch books from server (with pagination)
   * 2. For each book:
   *    - Check if exists locally by server_id
   *    - If exists: compare updateDate, keep newer
   *    - If not exists: INSERT with id=String(serverId), server_id=serverId
   * 3. Register ID mappings for new books
   */
  async pullBooksFromServer(): Promise<number> {
    let totalPulled = 0;
    let page = 1;
    let hasMore = true;

    const lastSyncTime = await this.getLastSyncTime();
    console.log(`Pull sync starting (last sync: ${lastSyncTime || 'never'})`);

    while (hasMore) {
      try {
        // Fetch books from server with incremental sync support
        const response: any = await bookAPI.getBooks(
          page, 
          SYNC_PAGE_SIZE, 
          true,  // includeAuthors
          true,  // includeCategories
          lastSyncTime  // updatedSince for incremental sync
        );

        const serverBooks = response.books || response.data || response;
        const booksArray = Array.isArray(serverBooks) ? serverBooks : [];

        console.log(`Fetched page ${page}: ${booksArray.length} books ${lastSyncTime ? `(updated since ${lastSyncTime})` : '(full sync)'}`);
        
        // No need for client-side filtering anymore since API handles incremental sync

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
      // Book exists locally - check for conflicts
      const serverBookMapped = this.mapServerBookToLocal(serverBook);
      
      if (hasBookConflict(localBook, serverBookMapped)) {
        // Conflict detected - mark for user resolution
        console.log(`Conflict detected for book ${localBook.id}`);
        await bookRepository.update(localBook.id, {
          _hasConflict: true,
          _conflictData: serverBookMapped,
        });
      } else {
        // No conflict - check if server version is newer
        const serverUpdateDate = new Date(serverBook.updateDate || serverBook.updatedAt);
        const localUpdateDate = new Date(localBook.updateDate);

        if (serverUpdateDate > localUpdateDate) {
          // Server version is newer - update local
          console.log(`Updating local book ${localBook.id} with server changes`);
          await bookRepository.update(localBook.id, {
            ...serverBookMapped,
            serverId, // Preserve server_id
          });
        } else {
          console.log(`Local book ${localBook.id} is up-to-date or newer`);
        }
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
   * FIXED: Always ensure _serverUpdatedAt is populated for conflict tracking
   */
  private mapServerBookToLocal(serverBook: any): Partial<Book> {
    // Ensure we capture server timestamp for conflict resolution
    const serverTimestamp = serverBook.updateDate || serverBook.updated_at || serverBook.updatedAt || new Date().toISOString();
    
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
      updateDate: serverTimestamp,
      _syncStatus: 'synced',
      _serverUpdatedAt: serverTimestamp, // CRITICAL: Always set for conflict detection
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

  /**
   * Pull authors from server (Phase 5 - Authors Sync)
   */
  async pullAuthorsFromServer(): Promise<number> {
    try {
      console.log('Pulling authors from server...');
      const lastSyncTime = await this.getLastSyncTime();
      const serverAuthors = await authorAPI.getAuthors(lastSyncTime);
      let pulledCount = 0;

      for (const serverAuthor of serverAuthors) {
        try {
          await this.mergeServerAuthor(serverAuthor);
          pulledCount++;
        } catch (error) {
          console.error(`Failed to merge author ${serverAuthor.id}:`, error);
        }
      }

      console.log(`Pulled ${pulledCount} authors from server`);
      return pulledCount;
    } catch (error) {
      console.error('Failed to pull authors from server:', error);
      throw error;
    }
  }

  /**
   * Pull categories from server (Phase 5 - Categories Sync)
   */
  async pullCategoriesFromServer(): Promise<number> {
    try {
      console.log('Pulling categories from server...');
      const lastSyncTime = await this.getLastSyncTime();
      const serverCategories = await categoryAPI.getCategories(lastSyncTime);
      let pulledCount = 0;

      for (const serverCategory of serverCategories) {
        try {
          await this.mergeServerCategory(serverCategory);
          pulledCount++;
        } catch (error) {
          console.error(`Failed to merge category ${serverCategory.id}:`, error);
        }
      }

      console.log(`Pulled ${pulledCount} categories from server`);
      return pulledCount;
    } catch (error) {
      console.error('Failed to pull categories from server:', error);
      throw error;
    }
  }

  /**
   * Merge server author into local database
   */
  private async mergeServerAuthor(serverAuthor: any): Promise<void> {
    const serverId = serverAuthor.id;
    const localAuthor = await authorRepository.findByServerId(serverId);

    if (localAuthor) {
      // Author exists locally - check for conflicts
      if (hasAuthorConflict(localAuthor, serverAuthor)) {
        // Conflict detected - mark for user resolution
        console.log(`Author conflict detected for ${localAuthor.id}`);
        await authorRepository.updateSyncFields(localAuthor.id, {
          _hasConflict: true,
          _conflictData: serverAuthor,
        });
      } else if (serverAuthor.updateDate && localAuthor._serverUpdatedAt) {
        const serverUpdateDate = new Date(serverAuthor.updateDate);
        const localUpdateDate = new Date(localAuthor._serverUpdatedAt);

        if (serverUpdateDate > localUpdateDate) {
          // Server version is newer - update local
          console.log(`Updating local author ${localAuthor.id} with server changes`);
          await authorRepository.updateSyncFields(localAuthor.id, {
            _serverUpdatedAt: serverAuthor.updateDate,
            _syncStatus: 'synced',
          });
        }
      }
    } else {
      // Author doesn't exist locally - find by name or create new
      const existingByName = await authorRepository.findByName(serverAuthor.name);
      
      if (existingByName) {
        // Found by name - update with server_id
        console.log(`Updating existing author ${existingByName.id} with server_id: ${serverId}`);
        await authorRepository.updateSyncFields(existingByName.id, {
          serverId,
          _serverUpdatedAt: serverAuthor.updateDate || new Date().toISOString(),
          _syncStatus: 'synced',
        });
        // Register ID mapping
        await idMappingService.registerTempId(existingByName.id.toString(), serverId, 'author');
      } else {
        // Create new author
        console.log(`Creating new author: ${serverAuthor.name} (server_id: ${serverId})`);
        const newAuthor = await authorRepository.create(serverAuthor.name);
        await authorRepository.updateSyncFields(newAuthor.id, {
          serverId,
          _serverUpdatedAt: serverAuthor.updateDate || new Date().toISOString(),
          _syncStatus: 'synced',
        });
        // Register ID mapping
        await idMappingService.registerTempId(newAuthor.id.toString(), serverId, 'author');
      }
    }
  }

  /**
   * Merge server category into local database
   */
  private async mergeServerCategory(serverCategory: any): Promise<void> {
    const serverId = serverCategory.id;
    const localCategory = await categoryRepository.findByServerId(serverId);

    if (localCategory) {
      // Category exists locally - check for conflicts
      if (hasCategoryConflict(localCategory, serverCategory)) {
        // Conflict detected - mark for user resolution
        console.log(`Category conflict detected for ${localCategory.id}`);
        await categoryRepository.updateSyncFields(localCategory.id, {
          _hasConflict: true,
          _conflictData: serverCategory,
        });
      } else if (serverCategory.updateDate && localCategory._serverUpdatedAt) {
        const serverUpdateDate = new Date(serverCategory.updateDate);
        const localUpdateDate = new Date(localCategory._serverUpdatedAt);

        if (serverUpdateDate > localUpdateDate) {
          // Server version is newer - update local
          console.log(`Updating local category ${localCategory.id} with server changes`);
          await categoryRepository.updateSyncFields(localCategory.id, {
            _serverUpdatedAt: serverCategory.updateDate,
            _syncStatus: 'synced',
          });
        }
      }
    } else {
      // Category doesn't exist locally - find by name or create new
      const existingByName = await categoryRepository.findByName(serverCategory.name);
      
      if (existingByName) {
        // Found by name - update with server_id
        console.log(`Updating existing category ${existingByName.id} with server_id: ${serverId}`);
        await categoryRepository.updateSyncFields(existingByName.id, {
          serverId,
          _serverUpdatedAt: serverCategory.updateDate || new Date().toISOString(),
          _syncStatus: 'synced',
        });
        // Register ID mapping
        await idMappingService.registerTempId(existingByName.id.toString(), serverId, 'category');
      } else {
        // Create new category
        console.log(`Creating new category: ${serverCategory.name} (server_id: ${serverId})`);
        const newCategory = await categoryRepository.create(serverCategory.name);
        await categoryRepository.updateSyncFields(newCategory.id, {
          serverId,
          _serverUpdatedAt: serverCategory.updateDate || new Date().toISOString(),
          _syncStatus: 'synced',
        });
        // Register ID mapping
        await idMappingService.registerTempId(newCategory.id.toString(), serverId, 'category');
      }
    }
  }

  /**
   * Alias for pullBooksFromServer() for backwards compatibility
   */
  async pullFromServer(): Promise<number> {
    return this.pullBooksFromServer();
  }
}

// Singleton instance
export const syncService = new SyncService();
