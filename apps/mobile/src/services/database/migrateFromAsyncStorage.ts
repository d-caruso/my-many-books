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

    // Optionally delete old AsyncStorage data
    // await AsyncStorage.removeItem(BOOKS_CACHE_KEY);

    console.log(`Migration completed: ${migratedCount}/${books.length} books migrated`);
    return { success: true, count: migratedCount };
  } catch (error: any) {
    console.error('Migration failed:', error);
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
