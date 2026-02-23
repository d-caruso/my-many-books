import { databaseService } from './DatabaseService';
import { ALL_TABLES } from './schema';

const SCHEMA_VERSION_KEY = 'schema_version';
const CURRENT_SCHEMA_VERSION = 4;

/**
 * Database migration system
 */
export class MigrationSystem {
  /**
   * Get current schema version from database
   */
  private async getCurrentVersion(): Promise<number> {
    try {
      const db = databaseService.getDatabase();

      // Create migrations table if it doesn't exist
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS migrations (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      const result = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM migrations WHERE key = ?',
        [SCHEMA_VERSION_KEY]
      );

      return result ? parseInt(result.value, 10) : 0;
    } catch (error) {
      console.error('Failed to get schema version:', error);
      return 0;
    }
  }

  /**
   * Set schema version in database
   */
  private async setVersion(version: number): Promise<void> {
    const db = databaseService.getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO migrations (key, value) VALUES (?, ?)',
      [SCHEMA_VERSION_KEY, version.toString()]
    );
  }

  /**
   * Run all migrations
   */
  async runMigrations(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();

    if (currentVersion === CURRENT_SCHEMA_VERSION) {
      console.log('Database schema is up to date');
      return;
    }

    console.log(`Migrating database from version ${currentVersion} to ${CURRENT_SCHEMA_VERSION}`);

    try {
      if (currentVersion === 0) {
        await this.createInitialSchema();
      }

      // Migrate to version 2: Add server_id column
      if (currentVersion < 2) {
        await this.migrateToVersion2();
      }

      // Migrate to version 3: Add server_id to authors and categories
      if (currentVersion < 3) {
        await this.migrateToVersion3();
      }

      // Migrate to version 4: Add category translation_key
      if (currentVersion < 4) {
        await this.migrateToVersion4();
      }

      await this.setVersion(CURRENT_SCHEMA_VERSION);
      console.log('Database migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Create initial schema (version 1)
   */
  private async createInitialSchema(): Promise<void> {
    console.log('Creating initial database schema...');
    const db = databaseService.getDatabase();

    for (const sql of ALL_TABLES) {
      await db.execAsync(sql);
    }

    console.log('Initial schema created successfully');
  }

  /**
   * Migrate to version 2: Add server_id column (Phase 5)
   */
  private async migrateToVersion2(): Promise<void> {
    console.log('Migrating to schema version 2: Adding server_id column...');
    const db = databaseService.getDatabase();

    try {
      // Check if server_id column already exists
      const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(books)');
      const hasServerId = tableInfo.some((col) => col.name === 'server_id');

      if (!hasServerId) {
        // Add server_id column to books table
        await db.execAsync('ALTER TABLE books ADD COLUMN server_id INTEGER;');
        console.log('Added server_id column to books table');
      } else {
        console.log('server_id column already exists, skipping ALTER TABLE');
      }

      // Create index on server_id for fast lookups
      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_books_server_id ON books(server_id);');
      console.log('Created index on server_id');

      // Migrate existing books: if id is numeric string, set server_id
      // This handles books that were synced from server before Phase 5
      const books = await db.getAllAsync<{ id: string; server_id: number | null }>(
        'SELECT id, server_id FROM books WHERE server_id IS NULL'
      );

      for (const book of books) {
        // Check if id is a numeric string (e.g., "42" from server)
        const numericId = parseInt(book.id, 10);
        if (!isNaN(numericId) && numericId.toString() === book.id) {
          // This book came from server, set server_id
          await db.runAsync(
            'UPDATE books SET server_id = ? WHERE id = ?',
            [numericId, book.id]
          );
        }
        // Temp IDs (e.g., "temp-1767...") will keep server_id as NULL
      }

      console.log(`Migrated ${books.length} existing books to include server_id`);
      console.log('Migration to version 2 completed successfully');
    } catch (error) {
      console.error('Migration to version 2 failed:', error);
      throw error;
    }
  }

  /**
   * Migrate to version 3: Add server_id to authors and categories (Phase 5)
   */
  private async migrateToVersion3(): Promise<void> {
    console.log('Migrating to schema version 3: Adding server_id to authors and categories...');
    const db = databaseService.getDatabase();

    try {
      // Check if server_id column already exists in authors table
      const authorTableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(authors)');
      const authorHasServerId = authorTableInfo.some((col) => col.name === 'server_id');

      if (!authorHasServerId) {
        // Add server_id and sync columns to authors table
        await db.execAsync('ALTER TABLE authors ADD COLUMN server_id INTEGER;');
        await db.execAsync('ALTER TABLE authors ADD COLUMN _sync_status TEXT DEFAULT "synced";');
        await db.execAsync('ALTER TABLE authors ADD COLUMN _server_updated_at TEXT;');
        console.log('Added server_id and sync columns to authors table');
      } else {
        console.log('server_id column already exists in authors table, skipping ALTER TABLE');
      }

      // Check if server_id column already exists in categories table
      const categoryTableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(categories)');
      const categoryHasServerId = categoryTableInfo.some((col) => col.name === 'server_id');

      if (!categoryHasServerId) {
        // Add server_id and sync columns to categories table
        await db.execAsync('ALTER TABLE categories ADD COLUMN server_id INTEGER;');
        await db.execAsync('ALTER TABLE categories ADD COLUMN _sync_status TEXT DEFAULT "synced";');
        await db.execAsync('ALTER TABLE categories ADD COLUMN _server_updated_at TEXT;');
        console.log('Added server_id and sync columns to categories table');
      } else {
        console.log('server_id column already exists in categories table, skipping ALTER TABLE');
      }

      // Create indexes for fast lookups
      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_authors_server_id ON authors(server_id);');
      await db.execAsync('CREATE INDEX IF NOT EXISTS idx_categories_server_id ON categories(server_id);');
      console.log('Created indexes on server_id columns');

      console.log('Migration to version 3 completed successfully');
    } catch (error) {
      console.error('Migration to version 3 failed:', error);
      throw error;
    }
  }

  /**
   * Migrate to version 4: Add translation_key to categories
   */
  private async migrateToVersion4(): Promise<void> {
    console.log('Migrating to schema version 4: Adding translation_key to categories...');
    const db = databaseService.getDatabase();

    try {
      const categoryTableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(categories)');
      const hasTranslationKey = categoryTableInfo.some((col) => col.name === 'translation_key');

      if (!hasTranslationKey) {
        await db.execAsync('ALTER TABLE categories ADD COLUMN translation_key TEXT;');
        console.log('Added translation_key column to categories table');
      } else {
        console.log('translation_key column already exists in categories table, skipping ALTER TABLE');
      }
    } catch (error) {
      console.error('Migration to version 4 failed:', error);
      throw error;
    }
  }
}

// Singleton instance
export const migrationSystem = new MigrationSystem();
