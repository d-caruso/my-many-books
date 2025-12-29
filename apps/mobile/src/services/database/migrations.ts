import { databaseService } from './DatabaseService';
import { ALL_TABLES } from './schema';

const SCHEMA_VERSION_KEY = 'schema_version';
const CURRENT_SCHEMA_VERSION = 1;

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

      // Future migrations would go here
      // if (currentVersion < 2) {
      //   await this.migrateToVersion2();
      // }

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
}

// Singleton instance
export const migrationSystem = new MigrationSystem();
