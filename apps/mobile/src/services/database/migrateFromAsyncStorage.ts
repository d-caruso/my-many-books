/**
 * Migration from AsyncStorage to SQLite
 * 
 * One-time migration to move books from AsyncStorage to SQLite database
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookRepository } from './BookRepository';
import type { Book } from '@/types';

const MIGRATION_KEY = 'asyncstorage_to_sqlite_migrated';
const BOOKS_STORAGE_KEY = 'cached_books';

/**
 * Migration result interface
 */
export interface MigrationResult {
  success: boolean;
  count: number;
  error?: string;
}

/**
 * Check if migration is needed
 */
export async function needsMigration(): Promise<boolean> {
  try {
    const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
    return migrated !== 'true';
  } catch (error) {
    // If we can't check migration status, assume migration is needed
    return true;
  }
}

/**
 * Reset migration flag (for testing)
 */
export async function resetMigrationFlag(): Promise<void> {
  await AsyncStorage.removeItem(MIGRATION_KEY);
}

/**
 * Migrate books from AsyncStorage to SQLite
 */
export async function migrateFromAsyncStorage(): Promise<MigrationResult> {
  try {
    // Check if migration already completed
    const migrationNeeded = await needsMigration();
    if (!migrationNeeded) {
      return {
        success: true,
        count: 0,
      };
    }

    // Get books from AsyncStorage
    const cachedData = await AsyncStorage.getItem(BOOKS_STORAGE_KEY);
    
    if (!cachedData) {
      // No data to migrate - mark as migrated
      await AsyncStorage.setItem(MIGRATION_KEY, 'true');
      return {
        success: true,
        count: 0,
      };
    }

    let books: Book[];
    try {
      books = JSON.parse(cachedData) as Book[];
    } catch (parseError) {
      return {
        success: false,
        count: 0,
        error: `Failed to parse AsyncStorage data: ${parseError.message}`,
      };
    }

    // Validate that books is an array
    if (!Array.isArray(books)) {
      return {
        success: false,
        count: 0,
        error: 'Invalid data format - expected array of books',
      };
    }

    // Migrate each book to SQLite
    let migratedCount = 0;
    for (const book of books) {
      try {
        // Validate required fields
        if (!book.title || !book.id) {
          continue; // Skip invalid books
        }

        // Ensure required fields are present
        const bookData = {
          ...book,
          creationDate: book.creationDate || new Date().toISOString(),
          updateDate: book.updateDate || new Date().toISOString(),
        };

        // Create book in SQLite
        await bookRepository.create(bookData);
        migratedCount++;
      } catch (bookError) {
        // Log error but continue with next book
        console.warn(`Failed to migrate book ${book.id}: ${bookError.message}`);
      }
    }

    // Mark migration as completed
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');

    return {
      success: true,
      count: migratedCount,
    };

  } catch (error) {
    return {
      success: false,
      count: 0,
      error: `Migration failed: ${error.message}`,
    };
  }
}