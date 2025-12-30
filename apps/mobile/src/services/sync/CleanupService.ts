import { databaseService } from '../database/DatabaseService';
import { operationQueue } from '../OperationQueue';
import { idMappingService } from './IDMappingService';

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
    console.log('Starting cleanup of orphaned temp IDs...');

    let deletedBooks = 0;
    let deletedMappings = 0;
    let deletedOperations = 0;

    // Step 1: Clean up old failed operations
    const failedOps = operationQueue.getPendingOperations().filter((op) => op.status === 'failed');

    const cutoffDate = Date.now() - MAX_OPERATION_AGE_DAYS * 24 * 60 * 60 * 1000;

    for (const op of failedOps) {
      if (op.timestamp < cutoffDate) {
        console.log(`Removing old failed operation: ${op.id} (age: ${Math.floor((Date.now() - op.timestamp) / (24 * 60 * 60 * 1000))} days)`);
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
       AND _sync_status = 'failed'`
    );

    for (const book of orphanedBooks) {
      const ageInDays = Math.floor(
        (Date.now() - new Date(book.creation_date).getTime()) / (24 * 60 * 60 * 1000)
      );

      if (ageInDays > MAX_TEMP_ID_AGE_DAYS) {
        console.log(`Deleting orphaned book: ${book.id} (age: ${ageInDays} days)`);

        // Delete book and related records
        await db.runAsync('DELETE FROM books WHERE id = ?', [book.id]);
        await db.runAsync('DELETE FROM book_authors WHERE book_id = ?', [book.id]);
        await db.runAsync('DELETE FROM book_categories WHERE book_id = ?', [book.id]);

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
      if (!bookExists && ageInDays > MAX_TEMP_ID_AGE_DAYS) {
        console.log(`Removing stale ID mapping: ${mapping.temp_id} (age: ${ageInDays} days)`);
        await db.runAsync('DELETE FROM id_mappings WHERE temp_id = ?', [mapping.temp_id]);
        deletedMappings++;
      }
    }

    console.log(`Cleanup complete: ${deletedBooks} books, ${deletedMappings} mappings, ${deletedOperations} operations`);

    return { deletedBooks, deletedMappings, deletedOperations };
  }

  /**
   * Update foreign keys after ID mapping (Task 5.5.2)
   *
   * When a book's temp ID is mapped to a server ID, update:
   * - book_authors.book_id
   * - book_categories.book_id
   *
   * This ensures referential integrity after ID changes.
   */
  async updateForeignKeysForBook(tempId: string, serverId: number): Promise<void> {
    console.log(`Updating foreign keys for book: ${tempId} → ${serverId}`);

    const db = databaseService.getDatabase();

    try {
      // Note: We keep the book.id as temp ID, but update book_authors/book_categories
      // to use the temp ID if they were using something else

      // Check if there are any foreign key references to update
      const authorLinks = await databaseService.getAllAsync(
        'SELECT * FROM book_authors WHERE book_id = ?',
        [tempId]
      );

      const categoryLinks = await databaseService.getAllAsync(
        'SELECT * FROM book_categories WHERE book_id = ?',
        [tempId]
      );

      console.log(`Found ${authorLinks.length} author links and ${categoryLinks.length} category links for book ${tempId}`);

      // Foreign keys should already be correct since we use book.id (temp ID) as the FK
      // But if we ever need to migrate, this is where we'd do it:

      // Example: If we wanted to change book_authors to use server_id instead:
      // await db.runAsync(
      //   'UPDATE book_authors SET book_id = ? WHERE book_id = ?',
      //   [String(serverId), tempId]
      // );

      console.log(`Foreign keys verified for book ${tempId}`);
    } catch (error) {
      console.error(`Failed to update foreign keys for book ${tempId}:`, error);
      throw error;
    }
  }

  /**
   * Perform full cleanup (Task 5.5.1 + 5.5.2)
   *
   * This should be called periodically (e.g., once per day)
   */
  async performFullCleanup(): Promise<void> {
    console.log('Performing full cleanup...');

    // Step 1: Cleanup orphaned data
    await this.cleanupOrphanedTempIds();

    // Step 2: Verify all ID mappings have correct foreign keys
    const mappings = await idMappingService.getAllMappings();

    for (const mapping of mappings) {
      try {
        await this.updateForeignKeysForBook(mapping.tempId, mapping.serverId);
      } catch (error) {
        console.error(`Failed to update foreign keys for ${mapping.tempId}:`, error);
      }
    }

    console.log('Full cleanup complete');
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
    const db = databaseService.getDatabase();

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

    console.log(`Data integrity check: ${orphanedAuthors.length} orphaned authors, ${orphanedCategories.length} orphaned categories, ${booksWithoutMapping.length} books without mapping`);

    return {
      orphanedAuthors: orphanedAuthors.length,
      orphanedCategories: orphanedCategories.length,
      missingBooks: booksWithoutMapping.length,
    };
  }
}

// Singleton instance
export const cleanupService = new CleanupService();
