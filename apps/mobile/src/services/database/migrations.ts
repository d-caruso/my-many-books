import { databaseService } from './DatabaseService';
import { ALL_TABLES } from './schema';

const SCHEMA_VERSION_KEY = 'schema_version';
const CURRENT_SCHEMA_VERSION = 2;

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
}

// Singleton instance
export const migrationSystem = new MigrationSystem();
