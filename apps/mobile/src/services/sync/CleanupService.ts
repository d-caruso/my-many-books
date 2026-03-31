import { databaseService } from '../database/DatabaseService';
import { operationQueue } from '../OperationQueue';
import { idMappingService } from './IDMappingService';
import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';
import { SYNC_STATUS } from '@/types';

const MAX_OPERATION_AGE_DAYS = 7; // Clean up operations older than 7 days
const MAX_TEMP_ID_AGE_DAYS = 30; // Clean up temp IDs older than 30 days

/**
 * Cleanup Service (Phase 5 - Task 5.5.1)
 *
 * Handles cleanup of orphaned temp IDs, failed operations, and stale data.
 */
export class CleanupService {
  /**
   * Cleanup orphaned temp IDs (Task 5.5.1)
   *
   * Scenarios to handle:
   * 1. Books with temp IDs that failed to sync after max retries
   * 2. Books deleted on server but still exist locally with temp ID
   * 3. Old failed operations that should be discarded
   */
  async cleanupOrphanedTempIds(): Promise<{
    deletedBooks: number;
    deletedMappings: number;
    deletedOperations: number;
  }> {
    // Emit cleanup start event for orphaned data
    mobileHooks.emit(MOBILE_EVENTS.SYNC.START, {
      operation: 'cleanup_orphaned',
      stage: 'orphaned_temp_ids',
      timestamp: new Date().toISOString()
    });

    let deletedBooks = 0;
    let deletedMappings = 0;
    let deletedOperations = 0;

    // Step 1: Clean up old failed operations
    const failedOps = operationQueue.getFailedOperations();

    const cutoffDate = Date.now() - MAX_OPERATION_AGE_DAYS * 24 * 60 * 60 * 1000;

    for (const op of failedOps) {
      if (op.timestamp < cutoffDate) {
        const ageInDays = Math.floor((Date.now() - op.timestamp) / (24 * 60 * 60 * 1000));
        
        mobileHooks.emit(MOBILE_EVENTS.QUEUE.DEQUEUE, {
          operationId: op.id,
          reason: 'age_exceeded',
          ageInDays: ageInDays,
          message: `Removing old failed operation: ${op.id} (age: ${ageInDays} days)`,
          timestamp: new Date().toISOString()
        });
        
        await operationQueue.dequeue(op.id);
        deletedOperations++;
      }
    }

    // Step 2: Clean up books with temp IDs that never synced
    const db = databaseService.getDatabase();

    // Find books with temp IDs (start with 'temp-') and no server_id
    const orphanedBooks = await databaseService.getAllAsync<{
      id: string;
      creation_date: string;
    }>(
      `SELECT id, creation_date FROM books
       WHERE id LIKE 'temp-%'
       AND server_id IS NULL
       AND sync_status = ?`,
      [SYNC_STATUS.FAILED]
    );

    for (const book of orphanedBooks) {
      const ageInDays = Math.floor(
        (Date.now() - new Date(book.creation_date).getTime()) / (24 * 60 * 60 * 1000)
      );

      if (ageInDays >= MAX_TEMP_ID_AGE_DAYS) {
        mobileHooks.emit(MOBILE_EVENTS.BOOK.DELETE.BEFORE, {
          bookId: book.id,
          reason: 'orphaned_cleanup',
          ageInDays: ageInDays,
          message: `Deleting orphaned book: ${book.id} (age: ${ageInDays} days)`,
          timestamp: new Date().toISOString()
        });

        // Delete book and related records
        await db.runAsync('DELETE FROM books WHERE id = ?', [book.id]);
        await db.runAsync('DELETE FROM book_authors WHERE book_id = ?', [book.id]);
        await db.runAsync('DELETE FROM book_categories WHERE book_id = ?', [book.id]);
        
        mobileHooks.emit(MOBILE_EVENTS.BOOK.DELETE.AFTER, {
          bookId: book.id,
          reason: 'orphaned_cleanup',
          ageInDays: ageInDays,
          timestamp: new Date().toISOString()
        });

        deletedBooks++;
      }
    }

    // Step 3: Clean up old ID mappings that are no longer needed
    const oldMappings = await databaseService.getAllAsync<{
      temp_id: string;
      created_at: string;
    }>(
      'SELECT temp_id, created_at FROM id_mappings'
    );

    for (const mapping of oldMappings) {
      const ageInDays = Math.floor(
        (Date.now() - new Date(mapping.created_at).getTime()) / (24 * 60 * 60 * 1000)
      );

      // Check if the temp_id still exists in books table
      const bookExists = await databaseService.getFirstAsync(
        'SELECT id FROM books WHERE id = ?',
        [mapping.temp_id]
      );

      // If book doesn't exist and mapping is old, remove it
      if (!bookExists && ageInDays >= MAX_TEMP_ID_AGE_DAYS) {
        mobileHooks.emit(MOBILE_EVENTS.SYNC.ID_MAPPING.START, {
          operation: 'remove_stale_mapping',
          tempId: mapping.temp_id,
          ageInDays: ageInDays,
          message: `Removing stale ID mapping: ${mapping.temp_id} (age: ${ageInDays} days)`,
          timestamp: new Date().toISOString()
        });
        
        await db.runAsync('DELETE FROM id_mappings WHERE temp_id = ?', [mapping.temp_id]);
        
        mobileHooks.emit(MOBILE_EVENTS.SYNC.ID_MAPPING.COMPLETE, {
          operation: 'remove_stale_mapping',
          tempId: mapping.temp_id,
          timestamp: new Date().toISOString()
        });
        
        deletedMappings++;
      }
    }

    // Emit cleanup complete event for orphaned data
    mobileHooks.emit(MOBILE_EVENTS.SYNC.CLEANUP.COMPLETE, {
      operation: 'cleanup_orphaned',
      stage: 'orphaned_temp_ids',
      results: { deletedBooks, deletedMappings, deletedOperations },
      timestamp: new Date().toISOString()
    });
    
    mobileHooks.emit(MOBILE_EVENTS.SYNC.COMPLETE, {
      operation: 'cleanup_orphaned',
      stage: 'orphaned_temp_ids',
      results: { deletedBooks, deletedMappings, deletedOperations },
      timestamp: new Date().toISOString()
    });

    return { deletedBooks, deletedMappings, deletedOperations };
  }

  /**
   * Perform full cleanup (Phase 5 fix)
   * 
   * This is the main method that should be called periodically to clean up:
   * - Old failed operations
   * - Orphaned temp IDs
   * - Stale ID mappings
   */
  async performFullCleanup(): Promise<{
    deletedBooks: number;
    deletedMappings: number;
    deletedOperations: number;
  }> {
    const cleanupSessionId = `cleanup-${Date.now()}`;
    
    // Emit cleanup start event
    mobileHooks.emit(MOBILE_EVENTS.SYNC.START, {
      sessionId: cleanupSessionId,
      operation: 'cleanup',
      stage: 'full_cleanup',
      timestamp: new Date().toISOString()
    });

    // Step 1: Cleanup orphaned data
    let counts = { deletedBooks: 0, deletedMappings: 0, deletedOperations: 0 };
    try {
      counts = await this.cleanupOrphanedTempIds();
    } catch (error) {
      mobileHooks.emit(MOBILE_EVENTS.SYNC.FAILED, {
        sessionId: cleanupSessionId,
        operation: 'cleanup_orphaned_temp_ids',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      // Continue with default counts
    }

    // Step 2: Cleanup failed operations from queue (only permanently failed ones)
    const failedOps = operationQueue.getFailedOperations();
    let permanentlyFailedCount = 0;
    const cutoffDate = Date.now() - MAX_OPERATION_AGE_DAYS * 24 * 60 * 60 * 1000;
    
    for (const op of failedOps) {
      // Only remove operations that are:
      // 1. Beyond max retry attempts AND
      // 2. Older than the cutoff date
      const isPermanentlyFailed = (op.retryCount || 0) >= 3; // Assume max retries is 3
      const isStale = op.timestamp < cutoffDate;
      
      if (isPermanentlyFailed && isStale) {
        const ageInDays = Math.floor((Date.now() - op.timestamp) / (24 * 60 * 60 * 1000));
        
        mobileHooks.emit(MOBILE_EVENTS.QUEUE.DEQUEUE, {
          operationId: op.id,
          reason: 'permanently_failed',
          retries: op.retryCount || 0,
          ageInDays: ageInDays,
          message: `Removing permanently failed operation: ${op.id} (retries: ${op.retryCount || 0}, age: ${ageInDays} days)`,
          timestamp: new Date().toISOString()
        });
        
        await operationQueue.dequeue(op.id);
        permanentlyFailedCount++;
      }
    }
    
    counts.deletedOperations += permanentlyFailedCount;

    // Step 3: Verify all ID mappings have correct foreign keys
    const mappings = await idMappingService.getAllMappings();

    for (const mapping of mappings) {
      try {
        await this.updateForeignKeysForBook(mapping.tempId, mapping.serverId);
      } catch (error) {
        mobileHooks.emit(MOBILE_EVENTS.SYNC.FAILED, {
          operation: 'update_foreign_keys',
          tempId: mapping.tempId,
          serverId: mapping.serverId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }
    }

    // Step 4: Handle edge case - books marked as 'pending' but with failed operations
    await this.fixInconsistentSyncStates();

    // Emit cleanup complete events
    mobileHooks.emit(MOBILE_EVENTS.SYNC.CLEANUP.COMPLETE, {
      sessionId: cleanupSessionId,
      operation: 'cleanup',
      stage: 'full_cleanup',
      results: counts,
      timestamp: new Date().toISOString()
    });
    
    mobileHooks.emit(MOBILE_EVENTS.SYNC.COMPLETE, {
      sessionId: cleanupSessionId,
      operation: 'cleanup',
      stage: 'full_cleanup',
      results: counts,
      timestamp: new Date().toISOString()
    });
    
    return counts;
  }

  /**
   * Update foreign keys after ID mapping (Task 5.5.2)
   *
   * When a book's temp ID is mapped to a server ID, update:
   * - book_authors.book_id
   * - book_categories.book_id
   *
   * This ensures referential integrity after ID changes.
   * NOTE: This is now primarily used for verification as BookRepository.replaceTempIdWithServerId
   * handles the actual foreign key updates in a transaction.
   */
  async updateForeignKeysForBook(bookId: string, serverId: number): Promise<void> {
    mobileHooks.emit(MOBILE_EVENTS.SYNC.START, {
      operation: 'update_foreign_keys',
      bookId: bookId,
      serverId: serverId,
      message: `Starting foreign key update for book: ${bookId} (server ID: ${serverId})`,
      timestamp: new Date().toISOString()
    });

    try {
      // Start transaction for atomicity
      await databaseService.executeQuery('BEGIN TRANSACTION');

      // Check if there are any foreign key references that need updating
      const authorLinks = await databaseService.getAllAsync(
        'SELECT * FROM book_authors WHERE book_id = ?',
        [bookId]
      );

      const categoryLinks = await databaseService.getAllAsync(
        'SELECT * FROM book_categories WHERE book_id = ?',
        [bookId]
      );

      mobileHooks.emit(MOBILE_EVENTS.SYNC.COMPLETE, {
        operation: 'foreign_key_analysis',
        bookId: bookId,
        authorLinks: authorLinks.length,
        categoryLinks: categoryLinks.length,
        message: `Found ${authorLinks.length} author links and ${categoryLinks.length} category links for book ${bookId}`,
        timestamp: new Date().toISOString()
      });

      // Actually update foreign keys if needed (this was the missing piece!)
      // If any foreign key references are using old temp IDs, update them
      
      // Check for any orphaned foreign keys that reference non-existent books
      const orphanedAuthors = await databaseService.getAllAsync(`
        SELECT ba.book_id, ba.author_id 
        FROM book_authors ba 
        WHERE ba.book_id NOT IN (SELECT id FROM books WHERE deleted = 0)
      `);
      
      const orphanedCategories = await databaseService.getAllAsync(`
        SELECT bc.book_id, bc.category_id 
        FROM book_categories bc 
        WHERE bc.book_id NOT IN (SELECT id FROM books WHERE deleted = 0)
      `);

      // Clean up orphaned foreign key references
      if (orphanedAuthors.length > 0) {
        mobileHooks.emit(MOBILE_EVENTS.AUTHOR.DELETE.BEFORE, {
          operation: 'cleanup_orphaned_links',
          count: orphanedAuthors.length,
          message: `Cleaning up ${orphanedAuthors.length} orphaned author links`,
          timestamp: new Date().toISOString()
        });
        
        await databaseService.executeQuery(`
          DELETE FROM book_authors 
          WHERE book_id NOT IN (SELECT id FROM books WHERE deleted = 0)
        `);
        
        mobileHooks.emit(MOBILE_EVENTS.AUTHOR.DELETE.AFTER, {
          operation: 'cleanup_orphaned_links',
          count: orphanedAuthors.length,
          timestamp: new Date().toISOString()
        });
      }

      if (orphanedCategories.length > 0) {
        mobileHooks.emit(MOBILE_EVENTS.CATEGORY.DELETE.BEFORE, {
          operation: 'cleanup_orphaned_links',
          count: orphanedCategories.length,
          message: `Cleaning up ${orphanedCategories.length} orphaned category links`,
          timestamp: new Date().toISOString()
        });
        
        await databaseService.executeQuery(`
          DELETE FROM book_categories 
          WHERE book_id NOT IN (SELECT id FROM books WHERE deleted = 0)
        `);
        
        mobileHooks.emit(MOBILE_EVENTS.CATEGORY.DELETE.AFTER, {
          operation: 'cleanup_orphaned_links',
          count: orphanedCategories.length,
          timestamp: new Date().toISOString()
        });
      }

      // Commit transaction
      await databaseService.executeQuery('COMMIT');
      
      mobileHooks.emit(MOBILE_EVENTS.SYNC.COMPLETE, {
        operation: 'update_foreign_keys',
        bookId: bookId,
        serverId: serverId,
        message: `Foreign keys updated and verified for book ${bookId}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Rollback on error
      await databaseService.executeQuery('ROLLBACK');
      
      mobileHooks.emit(MOBILE_EVENTS.SYNC.FAILED, {
        operation: 'update_foreign_keys',
        bookId: bookId,
        serverId: serverId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }


  /**
   * Fix inconsistent sync states (Edge case handler)
   *
   * Handles books that might be in 'pending' state but have no corresponding
   * operation in the queue, or books marked as 'failed' but should be retried.
   */
  async fixInconsistentSyncStates(): Promise<void> {
    // Emit cleanup start event for sync state fixes
    mobileHooks.emit(MOBILE_EVENTS.SYNC.START, {
      operation: 'fix_sync_states',
      stage: 'inconsistent_states',
      timestamp: new Date().toISOString()
    });

    // Find books marked as 'pending' but with no operation in queue
    const pendingBooks = await databaseService.getAllAsync<{
      id: string;
      title: string;
      sync_status: string;
    }>(`
      SELECT id, title, sync_status
      FROM books
      WHERE sync_status = '${SYNC_STATUS.PENDING}'
    `);

    const allOperations = operationQueue.getPendingOperations();

    for (const book of pendingBooks) {
      // Check if there's a corresponding operation
      const hasOperation = allOperations.some(
        op => op.resource === 'book' && op.payload?.id === book.id
      );

      if (!hasOperation) {
        // Emit validation failed event
        mobileHooks.emit(MOBILE_EVENTS.SYNC.VALIDATION_FAILED, {
          resourceType: 'book',
          resourceId: book.id,
          validationType: 'sync_state_consistency',
          issue: 'pending_without_operation',
          action: 'marked_as_failed',
          timestamp: new Date().toISOString()
        });
        
        // Mark as failed since sync attempt is lost
        await databaseService.executeQuery(
          'UPDATE books SET sync_status = ? WHERE id = ?',
          [SYNC_STATUS.FAILED, book.id]
        );
      }
    }

    // Find books marked as 'failed' that might be recoverable
    const failedBooks = await databaseService.getAllAsync<{
      id: string;
      server_id: number | null;
      sync_status: string;
      creation_date: string;
    }>(`
      SELECT id, server_id, sync_status, creation_date
      FROM books
      WHERE sync_status = ?
    `, [SYNC_STATUS.FAILED]);

    for (const book of failedBooks) {
      const ageInDays = Math.floor(
        (Date.now() - new Date(book.creation_date).getTime()) / (24 * 60 * 60 * 1000)
      );

      // If book has server_id, it was successfully synced at some point
      if (book.server_id) {
        // Emit validation failed event for incorrect sync status
        mobileHooks.emit(MOBILE_EVENTS.SYNC.VALIDATION_FAILED, {
          resourceType: 'book',
          resourceId: book.id,
          serverId: book.server_id,
          validationType: 'sync_status_correction',
          issue: 'failed_with_server_id',
          action: 'corrected_to_synced',
          timestamp: new Date().toISOString()
        });
        
        await databaseService.executeQuery(
          'UPDATE books SET sync_status = ? WHERE id = ?',
          [SYNC_STATUS.SYNCED, book.id]
        );
      } else if (ageInDays < 1) {
        // Recent failures might be retryable - reset to pending for retry
        // Emit validation event for retry attempt
        mobileHooks.emit(MOBILE_EVENTS.SYNC.VALIDATION_FAILED, {
          resourceType: 'book',
          resourceId: book.id,
          validationType: 'retry_eligibility',
          issue: 'recent_failure',
          action: 'reset_to_pending',
          ageInDays,
          timestamp: new Date().toISOString()
        });
        
        await databaseService.executeQuery(
          'UPDATE books SET sync_status = ? WHERE id = ?',
          [SYNC_STATUS.PENDING, book.id]
        );
      }
    }

    // Emit cleanup complete event for sync state fixes
    mobileHooks.emit(MOBILE_EVENTS.SYNC.COMPLETE, {
      operation: 'fix_sync_states',
      stage: 'inconsistent_states',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check data integrity
   *
   * Verify that all foreign keys are valid and no orphaned records exist
   */
  async checkDataIntegrity(): Promise<{
    orphanedAuthors: number;
    orphanedCategories: number;
    missingBooks: number;
  }> {
    // Find book_authors entries that reference non-existent books
    const orphanedAuthors = await databaseService.getAllAsync(`
      SELECT ba.book_id, ba.author_id
      FROM book_authors ba
      LEFT JOIN books b ON ba.book_id = b.id
      WHERE b.id IS NULL
    `);

    // Find book_categories entries that reference non-existent books
    const orphanedCategories = await databaseService.getAllAsync(`
      SELECT bc.book_id, bc.category_id
      FROM book_categories bc
      LEFT JOIN books b ON bc.book_id = b.id
      WHERE b.id IS NULL
    `);

    // Find books that have server_id but no ID mapping
    const booksWithoutMapping = await databaseService.getAllAsync(`
      SELECT b.id, b.server_id
      FROM books b
      WHERE b.server_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM id_mappings im WHERE im.temp_id = b.id
      )
    `);

    mobileHooks.emit(MOBILE_EVENTS.SYNC.COMPLETE, {
      operation: 'data_integrity_check',
      results: {
        orphanedAuthors: orphanedAuthors.length,
        orphanedCategories: orphanedCategories.length,
        booksWithoutMapping: booksWithoutMapping.length
      },
      message: `Data integrity check completed: ${orphanedAuthors.length} orphaned authors, ${orphanedCategories.length} orphaned categories, ${booksWithoutMapping.length} books without mapping`,
      timestamp: new Date().toISOString()
    });

    return {
      orphanedAuthors: orphanedAuthors.length,
      orphanedCategories: orphanedCategories.length,
      missingBooks: booksWithoutMapping.length,
    };
  }
}

// Singleton instance
export const cleanupService = new CleanupService();
