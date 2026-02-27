import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookAPI, authorAPI, categoryAPI } from '../api';
import { LocalBook } from '../../entities/LocalBook';
import { bookRepository } from '../database/BookRepository';
import { authorRepository } from '../database/AuthorRepository';
import { categoryRepository } from '../database/CategoryRepository';
import { idMappingService } from './IDMappingService';
import { operationQueue } from '../OperationQueue';
import { executeOperation } from '../QueueExecutor';
import { Book } from '../../types';
import { hasBookConflict, hasAuthorConflict, hasCategoryConflict } from '../../utils/conflictDetection';
import { getErrorMessage } from '../../utils/helpers';
import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';
import { RESOURCE_TYPES, CONFLICT_RESOLUTION_METHODS, VALIDATION_TYPES } from '../hooks/eventsSchema';
import { SYNC_STATUS } from '@/types';

const LAST_SYNC_KEY = '@last_sync_timestamp';
const SYNC_PAGE_SIZE = 50;

interface ServerBook {
  id: number;
  title: string;
  status: string;
  thumbnail?: string;
  description?: string;
  publishedDate?: string;
  pageCount?: number;
  rating?: number;
  notes?: string;
  creationDate?: string;
  updateDate?: string;
  updatedAt?: string;
}

interface ServerAuthor {
  id: number;
  name: string;
  updateDate?: string;
}

interface ServerCategory {
  id: number;
  name: string;
  translationKey?: string | null;
  updateDate?: string;
}

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
      mobileHooks.emit(MOBILE_EVENTS.SYNC.FAILED, {
        operation: 'getLastSyncTime',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  /**
   * Set last successful sync timestamp
   */
  async setLastSyncTime(timestamp: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, timestamp);
      
      // Note: Using a different event to avoid conflict with main sync complete
      mobileHooks.emit(MOBILE_EVENTS.SYNC.ID_MAPPING.COMPLETE, {
        operation: 'setLastSyncTime',
        timestamp: timestamp,
        message: 'Last sync time updated successfully'
      });
    } catch (error) {
      mobileHooks.emit(MOBILE_EVENTS.SYNC.FAILED, {
        operation: 'setLastSyncTime',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Perform full bidirectional sync
   * Task 5.4: Pull from server + Push to server
   */
  async performSync(): Promise<{ pulled: number; pushed: number; errors: number }> {
    if (this.isSyncing) {
      mobileHooks.emit(MOBILE_EVENTS.SYNC.FAILED, {
        operation: 'performSync',
        error: 'Sync already in progress',
        reason: 'duplicate_sync_attempt',
        timestamp: new Date().toISOString()
      });
      return { pulled: 0, pushed: 0, errors: 0 };
    }

    this.isSyncing = true;
    const syncSessionId = `sync-session-${Date.now()}`;
    let pulledCount = 0;
    let pushedCount = 0;
    let errorCount = 0;

    // Emit sync start event
    mobileHooks.emit(MOBILE_EVENTS.SYNC.START, {
      sessionId: syncSessionId,
      syncType: 'bidirectional',
      lastSyncTime: await this.getLastSyncTime(),
      timestamp: new Date().toISOString()
    });

    try {
      // Step 1: Push pending changes to server (Task 5.4.2)
      try {
        pushedCount = await this.pushToServer();
        
        // Emit upload complete event
        mobileHooks.emit(MOBILE_EVENTS.SYNC.UPLOAD.COMPLETE, {
          sessionId: syncSessionId,
          uploadedOperations: pushedCount,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        errorCount++;
        
        mobileHooks.emit(MOBILE_EVENTS.SYNC.FAILED, {
          sessionId: syncSessionId,
          stage: 'push',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        
        // Emit upload failed event
        mobileHooks.emit(MOBILE_EVENTS.SYNC.FAILED, {
          sessionId: syncSessionId,
          stage: 'upload',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }

      // Step 2: Pull changes from server (Task 5.4.1)
      try {
        // Emit download start event
        mobileHooks.emit(MOBILE_EVENTS.SYNC.DOWNLOAD.START, {
          sessionId: syncSessionId,
          downloadType: 'incremental',
          timestamp: new Date().toISOString()
        });
        
        // Emit book sync pull start event
        mobileHooks.emit(MOBILE_EVENTS.BOOK.SYNC.PULL.START, {
          sessionId: syncSessionId,
          timestamp: new Date().toISOString()
        });
        
        const booksPulled = await this.pullBooksFromServer();
        const authorsPulled = await this.pullAuthorsFromServer();
        const categoriesPulled = await this.pullCategoriesFromServer();
        pulledCount = booksPulled + authorsPulled + categoriesPulled;
        
        mobileHooks.emit(MOBILE_EVENTS.SYNC.DOWNLOAD.COMPLETE, {
          sessionId: syncSessionId,
          totalPulled: pulledCount,
          breakdown: {
            books: booksPulled,
            authors: authorsPulled,
            categories: categoriesPulled
          },
          message: `Successfully pulled ${pulledCount} total records from server`,
          timestamp: new Date().toISOString()
        });
        
        // Emit download complete event
        mobileHooks.emit(MOBILE_EVENTS.SYNC.DOWNLOAD.COMPLETE, {
          sessionId: syncSessionId,
          downloadedRecords: pulledCount,
          breakdown: {
            books: booksPulled,
            authors: authorsPulled,
            categories: categoriesPulled
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        errorCount++;
        
        mobileHooks.emit(MOBILE_EVENTS.SYNC.FAILED, {
          sessionId: syncSessionId,
          stage: 'pull',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        
        // Emit download failed event
        mobileHooks.emit(MOBILE_EVENTS.SYNC.FAILED, {
          sessionId: syncSessionId,
          stage: 'download',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }

      // Step 3: Update last sync time (Task 5.4.3)
      if (errorCount === 0) {
        await this.setLastSyncTime(new Date().toISOString());
      }

      // Step 4: Perform cleanup after successful sync (Phase 5 fix)
      try {
        const { cleanupService } = await import('./CleanupService');
        const cleanupResult = await cleanupService.performFullCleanup();
        
        mobileHooks.emit(MOBILE_EVENTS.SYNC.CLEANUP.COMPLETE, {
          sessionId: syncSessionId,
          cleanupResults: cleanupResult,
          message: 'Sync cleanup completed successfully',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        mobileHooks.emit(MOBILE_EVENTS.SYNC.FAILED, {
          sessionId: syncSessionId,
          stage: 'cleanup',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }

      // Emit sync complete event
      if (errorCount === 0) {
        mobileHooks.emit(MOBILE_EVENTS.SYNC.COMPLETE, {
          sessionId: syncSessionId,
          syncType: 'bidirectional',
          pulledCount,
          pushedCount,
          duration: Date.now() - parseInt(syncSessionId.split('-')[2]),
          timestamp: new Date().toISOString()
        });
      } else {
        mobileHooks.emit(MOBILE_EVENTS.SYNC.FAILED, {
          sessionId: syncSessionId,
          stage: 'completion',
          errorCount,
          partialResults: { pulledCount, pushedCount },
          timestamp: new Date().toISOString()
        });
      }
      
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
    
    mobileHooks.emit(MOBILE_EVENTS.BOOK.SYNC.PULL.START, {
      lastSyncTime: lastSyncTime || 'never',
      syncType: lastSyncTime ? 'incremental' : 'full',
      message: `Book pull sync starting (last sync: ${lastSyncTime || 'never'})`,
      timestamp: new Date().toISOString()
    });

    while (hasMore) {
      try {
        // Fetch books from server with incremental sync support
        const response: { books?: ServerBook[]; data?: ServerBook[] } = await bookAPI.getBooks(
          page, 
          SYNC_PAGE_SIZE, 
          true,  // includeAuthors
          true,  // includeCategories
          lastSyncTime  // updatedSince for incremental sync
        );

        const serverBooks = response.books || response.data || response;
        const booksArray = Array.isArray(serverBooks) ? serverBooks : [];

        mobileHooks.emit(MOBILE_EVENTS.BOOK.SYNC.PULL.SUCCESS, {
          page: page,
          count: booksArray.length,
          syncType: lastSyncTime ? 'incremental' : 'full',
          lastSyncTime: lastSyncTime,
          message: `Fetched page ${page}: ${booksArray.length} books ${lastSyncTime ? `(updated since ${lastSyncTime})` : '(full sync)'}`,
          timestamp: new Date().toISOString()
        });
        
        // No need for client-side filtering anymore since API handles incremental sync

        for (const serverBook of booksArray) {
          try {
            await this.mergeServerBook(serverBook);
            totalPulled++;
          } catch (error) {
            // Emit validation failed event for data consistency issues
            mobileHooks.emit(MOBILE_EVENTS.SYNC.VALIDATION_FAILED, {
              resourceType: RESOURCE_TYPES.BOOK,
              resourceId: serverBook.id,
              validationType: VALIDATION_TYPES.MERGE_OPERATION,
              error: getErrorMessage(error),
              timestamp: new Date().toISOString()
            });
            
            mobileHooks.emit(MOBILE_EVENTS.BOOK.SYNC.MERGE.FAILED, {
              bookId: serverBook.id,
              error: getErrorMessage(error),
              timestamp: new Date().toISOString()
            });
          }
        }

        // Check if there are more pages
        hasMore = booksArray.length === SYNC_PAGE_SIZE;
        page++;
      } catch (error) {
        mobileHooks.emit(MOBILE_EVENTS.BOOK.SYNC.PULL.FAILED, {
          page: page,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    }

    return totalPulled;
  }

  /**
   * Merge a server book into local database
   * Handles conflict resolution based on updateDate
   */
  private async mergeServerBook(serverBook: ServerBook): Promise<void> {
    const serverId = serverBook.id;

    // Check if book exists locally by server_id
    const localBook = await bookRepository.findByServerId(serverId);

    if (localBook) {
      // Book exists locally - check for conflicts
      const serverBookMapped = this.mapServerBookToLocal(serverBook);
      
      if (hasBookConflict(localBook, serverBookMapped)) {
        // Conflict detected - mark for user resolution

        // Emit book-specific conflict detected event
        mobileHooks.emit(MOBILE_EVENTS.BOOK.SYNC.CONFLICT.DETECTED, {
          resourceType: 'book',
          resourceId: localBook.entity.id,
          serverId: serverId,
          conflictType: 'data_mismatch',
          localData: localBook,
          serverData: serverBookMapped,
          timestamp: new Date().toISOString()
        });

        await bookRepository.update(String(localBook.entity.id), new LocalBook(localBook.entity));
        
        // Emit conflict resolution event
        mobileHooks.emit(MOBILE_EVENTS.BOOK.SYNC.CONFLICT.RESOLVED, {
          resourceType: RESOURCE_TYPES.BOOK,
          resourceId: localBook.entity.id,
          serverId: serverId,
          resolutionMethod: CONFLICT_RESOLUTION_METHODS.FLAG_FOR_MANUAL_RESOLUTION,
          timestamp: new Date().toISOString()
        });
      } else {
        // No conflict - check if server version is newer
        const serverUpdateDate = new Date(serverBook.updateDate || serverBook.updatedAt);
        const localUpdateDate = new Date(localBook.entity.updateDate as string);

        if (serverUpdateDate > localUpdateDate) {
          // Server version is newer - update local
          const localId = String(localBook.entity.id);
          // Emit book update event
          mobileHooks.emit(MOBILE_EVENTS.BOOK.UPDATE.START, {
            bookId: localId,
            serverId,
            reason: 'server_sync',
            timestamp: new Date().toISOString()
          });

          const serverTimestamp = serverBook.updateDate || serverBook.updatedAt || new Date().toISOString();
          const updatedBook = new LocalBook({ ...serverBookMapped, id: localBook.entity.id } as Book);
          updatedBook.serverId = serverId;
          updatedBook.syncStatus = SYNC_STATUS.SYNCED;
          updatedBook.serverUpdatedAt = serverTimestamp;
          await bookRepository.update(localId, updatedBook);

          // Emit book update success event
          mobileHooks.emit(MOBILE_EVENTS.BOOK.UPDATE.SUCCESS, {
            bookId: localId,
            serverId,
            reason: 'server_sync',
            timestamp: new Date().toISOString()
          });
        } else {
          mobileHooks.emit(MOBILE_EVENTS.BOOK.SYNC.PULL.SUCCESS, {
            bookId: localBook.entity.id,
            reason: 'local_up_to_date',
            message: `Local book ${localBook.entity.id} is up-to-date or newer`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } else {
      // Book doesn't exist locally - insert new
      const newBook = this.mapServerBookToLocal(serverBook);

      // Use server ID as local ID (converted to string)
      const localId = String(serverId);

      // Emit book creation event
      mobileHooks.emit(MOBILE_EVENTS.BOOK.CREATE.START, {
        bookId: localId,
        serverId,
        source: 'server_sync',
        timestamp: new Date().toISOString()
      });

      const serverTimestamp = serverBook.updateDate || serverBook.updatedAt || new Date().toISOString();
      const local = new LocalBook({ ...newBook, id: Number(localId) } as Book);
      local.serverId = serverId;
      local.syncStatus = SYNC_STATUS.SYNCED;
      local.serverUpdatedAt = serverTimestamp;
      await bookRepository.create(local);
      
      // Emit book creation success event
      mobileHooks.emit(MOBILE_EVENTS.BOOK.CREATE.SUCCESS, {
        bookId: localId,
        serverId,
        source: 'server_sync',
        timestamp: new Date().toISOString()
      });

      // Register ID mapping
      await idMappingService.registerTempId(localId, serverId, 'book');
    }
  }

  /**
   * Map server book format to local Book format
   * FIXED: Always ensure _serverUpdatedAt is populated for conflict tracking
   */
  private mapServerBookToLocal(serverBook: ServerBook): Partial<Book> {
    // Ensure we capture server timestamp for conflict resolution
    const serverTimestamp = serverBook.updateDate || serverBook.updated_at || serverBook.updatedAt || new Date().toISOString();
    
    return {
      title: serverBook.title,
      status: serverBook.status as Book['status'],
      thumbnail: serverBook.thumbnail,
      description: serverBook.description,
      publishedDate: serverBook.publishedDate || serverBook.published_date,
      pageCount: serverBook.pageCount || serverBook.page_count,
      rating: serverBook.rating,
      notes: serverBook.notes,
      creationDate: serverBook.creationDate || serverBook.created_at || new Date().toISOString(),
      updateDate: serverTimestamp,
      _syncStatus: SYNC_STATUS.SYNCED,
      serverUpdatedAt: serverTimestamp, // CRITICAL: Always set for conflict detection
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
      mobileHooks.emit(MOBILE_EVENTS.SYNC.UPLOAD.COMPLETE, {
        pendingOperations: 0,
        message: 'No pending operations to push',
        timestamp: new Date().toISOString()
      });
      return 0;
    }

    // Emit upload start event
    mobileHooks.emit(MOBILE_EVENTS.SYNC.UPLOAD.START, {
      pendingOperations: pendingCount,
      queueSize: operationQueue.size(),
      timestamp: new Date().toISOString()
    });

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
      // Emit author sync pull start event
      mobileHooks.emit(MOBILE_EVENTS.AUTHOR.SYNC.PULL.START, {
        timestamp: new Date().toISOString()
      });
      
      const lastSyncTime = await this.getLastSyncTime();
      const serverAuthors = await authorAPI.getAuthors(lastSyncTime);
      let pulledCount = 0;

      for (const serverAuthor of serverAuthors) {
        try {
          await this.mergeServerAuthor(serverAuthor);
          pulledCount++;
        } catch (error) {
          // Emit validation failed event for data consistency issues
          mobileHooks.emit(MOBILE_EVENTS.SYNC.VALIDATION_FAILED, {
            resourceType: RESOURCE_TYPES.AUTHOR,
            resourceId: serverAuthor.id,
            validationType: VALIDATION_TYPES.MERGE_OPERATION,
            error: getErrorMessage(error),
            timestamp: new Date().toISOString()
          });
          
          // Emit author sync merge failed event
          mobileHooks.emit(MOBILE_EVENTS.AUTHOR.SYNC.MERGE.FAILED, {
            authorId: serverAuthor.id,
            error: getErrorMessage(error),
            timestamp: new Date().toISOString()
          });
        }
      }

      // Emit author sync pull success event
      mobileHooks.emit(MOBILE_EVENTS.AUTHOR.SYNC.PULL.SUCCESS, {
        pulledCount,
        timestamp: new Date().toISOString()
      });
      
      return pulledCount;
    } catch (error) {
      mobileHooks.emit(MOBILE_EVENTS.AUTHOR.SYNC.PULL.FAILED, {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Pull categories from server (Phase 5 - Categories Sync)
   */
  async pullCategoriesFromServer(): Promise<number> {
    try {
      // Emit category sync pull start event
      mobileHooks.emit(MOBILE_EVENTS.CATEGORY.SYNC.PULL.START, {
        timestamp: new Date().toISOString()
      });
      
      const lastSyncTime = await this.getLastSyncTime();
      const serverCategories = await categoryAPI.getCategories(lastSyncTime);
      let pulledCount = 0;

      for (const serverCategory of serverCategories) {
        try {
          await this.mergeServerCategory(serverCategory);
          pulledCount++;
        } catch (error) {
          // Emit validation failed event for data consistency issues
          mobileHooks.emit(MOBILE_EVENTS.SYNC.VALIDATION_FAILED, {
            resourceType: RESOURCE_TYPES.CATEGORY,
            resourceId: serverCategory.id,
            validationType: VALIDATION_TYPES.MERGE_OPERATION,
            error: getErrorMessage(error),
            timestamp: new Date().toISOString()
          });
          
          // Emit category sync merge failed event
          mobileHooks.emit(MOBILE_EVENTS.CATEGORY.SYNC.MERGE.FAILED, {
            categoryId: serverCategory.id,
            error: getErrorMessage(error),
            timestamp: new Date().toISOString()
          });
        }
      }

      // Emit category sync pull success event
      mobileHooks.emit(MOBILE_EVENTS.CATEGORY.SYNC.PULL.SUCCESS, {
        pulledCount,
        timestamp: new Date().toISOString()
      });
      
      return pulledCount;
    } catch (error) {
      mobileHooks.emit(MOBILE_EVENTS.CATEGORY.SYNC.PULL.FAILED, {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Merge server author into local database
   */
  private async mergeServerAuthor(serverAuthor: ServerAuthor): Promise<void> {
    const serverId = serverAuthor.id;
    const localAuthor = await authorRepository.findByServerId(serverId);

    if (localAuthor) {
      // Author exists locally - check for conflicts
      if (hasAuthorConflict(localAuthor, serverAuthor)) {
        // Conflict detected - mark for user resolution
        
        // Emit author-specific conflict detected event
        mobileHooks.emit(MOBILE_EVENTS.AUTHOR.SYNC.CONFLICT.DETECTED, {
          resourceType: 'author',
          resourceId: localAuthor.entity.id,
          serverId: serverId,
          conflictType: 'data_mismatch',
          localData: localAuthor,
          serverData: serverAuthor,
          timestamp: new Date().toISOString()
        });

        await authorRepository.updateSyncFields(localAuthor.entity.id, {});

        // Emit conflict resolution event
        mobileHooks.emit(MOBILE_EVENTS.AUTHOR.SYNC.CONFLICT.RESOLVED, {
          resourceType: RESOURCE_TYPES.AUTHOR,
          resourceId: localAuthor.entity.id,
          serverId: serverId,
          resolutionMethod: CONFLICT_RESOLUTION_METHODS.FLAG_FOR_MANUAL_RESOLUTION,
          timestamp: new Date().toISOString()
        });
      } else if (serverAuthor.updateDate && localAuthor.serverUpdatedAt) {
        const serverUpdateDate = new Date(serverAuthor.updateDate);
        const localUpdateDate = new Date(localAuthor.serverUpdatedAt);

        if (serverUpdateDate > localUpdateDate) {
          // Server version is newer - update local
          mobileHooks.emit(MOBILE_EVENTS.AUTHOR.UPDATE.START, {
            authorId: localAuthor.entity.id,
            serverId: serverAuthor.id,
            reason: 'server_sync',
            message: `Updating local author ${localAuthor.entity.id} with server changes`,
            timestamp: new Date().toISOString()
          });

          await authorRepository.updateSyncFields(localAuthor.entity.id, {
            serverUpdatedAt: serverAuthor.updateDate,
            syncStatus: SYNC_STATUS.SYNCED,
          });

          mobileHooks.emit(MOBILE_EVENTS.AUTHOR.UPDATE.SUCCESS, {
            authorId: localAuthor.entity.id,
            serverId: serverAuthor.id,
            reason: 'server_sync',
            timestamp: new Date().toISOString()
          });
        }
      }
    } else {
      // Author doesn't exist locally - find by name or create new
      const existingByName = await authorRepository.findByName(serverAuthor.name);
      
      if (existingByName) {
        // Found by name - update with server_id
        mobileHooks.emit(MOBILE_EVENTS.AUTHOR.UPDATE.START, {
          authorId: existingByName.entity.id,
          serverId: serverId,
          reason: 'server_id_mapping',
          message: `Updating existing author ${existingByName.entity.id} with server_id: ${serverId}`,
          timestamp: new Date().toISOString()
        });

        await authorRepository.updateSyncFields(existingByName.entity.id, {
          serverId,
          serverUpdatedAt: serverAuthor.updateDate || new Date().toISOString(),
          syncStatus: SYNC_STATUS.SYNCED,
        });
        // Register ID mapping
        await idMappingService.registerTempId(existingByName.entity.id.toString(), serverId, 'author');
      } else {
        // Create new author
        // Emit author creation event
        mobileHooks.emit(MOBILE_EVENTS.AUTHOR.CREATE.START, {
          authorName: serverAuthor.name,
          serverId,
          timestamp: new Date().toISOString()
        });
        
        const newAuthor = await authorRepository.create(serverAuthor.name);
        await authorRepository.updateSyncFields(newAuthor.entity.id, {
          serverId,
          serverUpdatedAt: serverAuthor.updateDate || new Date().toISOString(),
          syncStatus: SYNC_STATUS.SYNCED,
        });

        // Emit author creation success event
        mobileHooks.emit(MOBILE_EVENTS.AUTHOR.CREATE.SUCCESS, {
          authorId: newAuthor.entity.id,
          authorName: serverAuthor.name,
          serverId,
          timestamp: new Date().toISOString()
        });

        // Register ID mapping
        await idMappingService.registerTempId(newAuthor.entity.id.toString(), serverId, 'author');
      }
    }
  }

  /**
   * Merge server category into local database
   */
  private async mergeServerCategory(serverCategory: ServerCategory): Promise<void> {
    const serverId = serverCategory.id;
    const localCategory = await categoryRepository.findByServerId(serverId);

    if (localCategory) {
      // Category exists locally - check for conflicts
      if (hasCategoryConflict(localCategory, serverCategory)) {
        // Conflict detected - mark for user resolution
        
        // Emit category-specific conflict detected event
        mobileHooks.emit(MOBILE_EVENTS.CATEGORY.SYNC.CONFLICT.DETECTED, {
          resourceType: 'category',
          resourceId: localCategory.entity.id,
          serverId: serverId,
          conflictType: 'data_mismatch',
          localData: localCategory,
          serverData: serverCategory,
          timestamp: new Date().toISOString()
        });
        
        await categoryRepository.updateSyncFields(localCategory.entity.id, {});

        // Emit conflict resolution event
        mobileHooks.emit(MOBILE_EVENTS.CATEGORY.SYNC.CONFLICT.RESOLVED, {
          resourceType: RESOURCE_TYPES.CATEGORY,
          resourceId: localCategory.entity.id,
          serverId: serverId,
          resolutionMethod: CONFLICT_RESOLUTION_METHODS.FLAG_FOR_MANUAL_RESOLUTION,
          timestamp: new Date().toISOString()
        });
      } else if (serverCategory.updateDate && localCategory.serverUpdatedAt) {
        const serverUpdateDate = new Date(serverCategory.updateDate);
        const localUpdateDate = new Date(localCategory.serverUpdatedAt);

        if (serverUpdateDate > localUpdateDate) {
          // Server version is newer - update local
          mobileHooks.emit(MOBILE_EVENTS.CATEGORY.UPDATE.START, {
            categoryId: localCategory.entity.id,
            serverId: serverCategory.id,
            reason: 'server_sync',
            message: `Updating local category ${localCategory.entity.id} with server changes`,
            timestamp: new Date().toISOString()
          });
          
          await categoryRepository.updateSyncFields(localCategory.entity.id, {
            translationKey: serverCategory.translationKey ?? null,
            serverUpdatedAt: serverCategory.updateDate,
            syncStatus: SYNC_STATUS.SYNCED,
          });

          mobileHooks.emit(MOBILE_EVENTS.CATEGORY.UPDATE.SUCCESS, {
            categoryId: localCategory.entity.id,
            serverId: serverCategory.id,
            reason: 'server_sync',
            timestamp: new Date().toISOString()
          });
        }
      }
    } else {
      // Category doesn't exist locally - find by name or create new
      const existingByName = await categoryRepository.findByName(serverCategory.name);
      
      if (existingByName) {
        // Found by name - update with server_id
        mobileHooks.emit(MOBILE_EVENTS.CATEGORY.UPDATE.START, {
          categoryId: existingByName.entity.id,
          serverId: serverId,
          reason: 'server_id_mapping',
          message: `Updating existing category ${existingByName.entity.id} with server_id: ${serverId}`,
          timestamp: new Date().toISOString()
        });
        
        await categoryRepository.updateSyncFields(existingByName.entity.id, {
          serverId,
          translationKey: serverCategory.translationKey ?? null,
          serverUpdatedAt: serverCategory.updateDate || new Date().toISOString(),
          syncStatus: SYNC_STATUS.SYNCED,
        });
        // Register ID mapping
        await idMappingService.registerTempId(existingByName.entity.id.toString(), serverId, 'category');
      } else {
        // Create new category
        // Emit category creation event
        mobileHooks.emit(MOBILE_EVENTS.CATEGORY.CREATE.START, {
          categoryName: serverCategory.name,
          serverId,
          timestamp: new Date().toISOString()
        });
        
        const newCategory = await categoryRepository.create(
          serverCategory.name,
          serverCategory.translationKey ?? null
        );
        await categoryRepository.updateSyncFields(newCategory.entity.id, {
          serverId,
          translationKey: serverCategory.translationKey ?? null,
          serverUpdatedAt: serverCategory.updateDate || new Date().toISOString(),
          syncStatus: SYNC_STATUS.SYNCED,
        });

        // Emit category creation success event
        mobileHooks.emit(MOBILE_EVENTS.CATEGORY.CREATE.SUCCESS, {
          categoryId: newCategory.entity.id,
          categoryName: serverCategory.name,
          serverId,
          timestamp: new Date().toISOString()
        });

        // Register ID mapping
        await idMappingService.registerTempId(newCategory.entity.id.toString(), serverId, 'category');
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
