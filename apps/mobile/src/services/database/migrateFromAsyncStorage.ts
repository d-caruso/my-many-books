import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookRepository } from './BookRepository';
import type { Book } from '@/types';

const MIGRATION_FLAG = 'asyncstorage_to_sqlite_migrated';
const BOOKS_CACHE_KEY = 'cached_books';

/**
 * Migrate books from AsyncStorage to SQLite
 */
export async function migrateFromAsyncStorage(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    // Check if migration already completed
    const migrated = await AsyncStorage.getItem(MIGRATION_FLAG);
    if (migrated === 'true') {
      console.log('Migration already completed');
      return { success: true, count: 0 };
    }

    // Read books from AsyncStorage
    const booksJson = await AsyncStorage.getItem(BOOKS_CACHE_KEY);
    if (!booksJson) {
      console.log('No books to migrate');
      await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
      return { success: true, count: 0 };
    }

    const books: Book[] = JSON.parse(booksJson);
    console.log(`Migrating ${books.length} books from AsyncStorage to SQLite...`);

    // Insert books into SQLite
    let migratedCount = 0;
    for (const book of books) {
      try {
        await bookRepository.create(book);
        migratedCount++;
      } catch (error) {
        console.error(`Failed to migrate book ${book.id}:`, error);
      }
    }

    // Mark migration as complete
    await AsyncStorage.setItem(MIGRATION_FLAG, 'true');

    // Delete old AsyncStorage data after successful migration (Task 4.4.2)
    // Only delete after marking successful to preserve data on failure
    await AsyncStorage.removeItem(BOOKS_CACHE_KEY);

    console.log(`Migration completed: ${migratedCount}/${books.length} books migrated`);
    return { success: true, count: migratedCount };
  } catch (error: any) {
    console.error('Migration failed:', error);
    // IMPORTANT: Do not delete AsyncStorage data on failure to preserve user data
    console.log('AsyncStorage data preserved due to migration failure');
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Check if migration is needed
 */
export async function needsMigration(): Promise<boolean> {
  const migrated = await AsyncStorage.getItem(MIGRATION_FLAG);
  return migrated !== 'true';
}

/**
 * Reset migration flag (for testing)
 */
export async function resetMigrationFlag(): Promise<void> {
  await AsyncStorage.removeItem(MIGRATION_FLAG);
}

/**
 * Check if AsyncStorage data exists to inform users about data preservation
 */
export async function hasAsyncStorageData(): Promise<{
  hasData: boolean;
  bookCount?: number;
}> {
  try {
    const booksJson = await AsyncStorage.getItem(BOOKS_CACHE_KEY);
    if (!booksJson) {
      return { hasData: false };
    }
    
    const books: Book[] = JSON.parse(booksJson);
    return { hasData: true, bookCount: books.length };
  } catch (error) {
    console.error('Error checking AsyncStorage data:', error);
    return { hasData: false };
  }
}

/**
 * Cleanup all legacy AsyncStorage keys (Task 4.4.2)
 * This removes any remaining cached data after migration
 */
export async function cleanupLegacyStorage(): Promise<void> {
  try {
    console.log('Cleaning up legacy AsyncStorage keys...');
    
    // List of known legacy keys that might exist
    const legacyKeys = [
      BOOKS_CACHE_KEY,
      'user_books', // potential legacy key
      'book_cache', // potential legacy key
      'cached_search_results', // potential legacy key
    ];

    // Remove each legacy key
    for (const key of legacyKeys) {
      await AsyncStorage.removeItem(key);
    }
    
    console.log('Legacy AsyncStorage cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup legacy storage:', error);
  }
}
