import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'my_many_books.db';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  /**
   * Open database connection
   */
  async openDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) {
      return this.db;
    }

    try {
      this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      console.log('Database opened successfully');
      return this.db;
    } catch (error) {
      console.error('Failed to open database:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  getDatabase(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call openDatabase() first.');
    }
    return this.db;
  }

  /**
   * Close database connection
   */
  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      console.log('Database closed');
    }
  }

  /**
   * Execute SQL query
   */
  async executeQuery(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowId: number }> {
    const db = this.getDatabase();
    try {
      const result = await db.runAsync(sql, params);
      return result;
    } catch (error) {
      console.error('Query execution failed:', sql, error);
      throw error;
    }
  }

  /**
   * Execute SQL query and return all rows
   */
  async getAllAsync<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const db = this.getDatabase();
    try {
      const result = await db.getAllAsync(sql, params);
      return result;
    } catch (error) {
      console.error('Query failed:', sql, error);
      throw error;
    }
  }

  /**
   * Execute SQL query and return first row
   */
  async getFirstAsync<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const db = this.getDatabase();
    try {
      const result = await db.getFirstAsync(sql, params);
      return result;
    } catch (error) {
      console.error('Query failed:', sql, error);
      throw error;
    }
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
