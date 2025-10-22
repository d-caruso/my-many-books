// ================================================================
// src/utils/database.ts
// ================================================================

import { Sequelize } from 'sequelize';
import DatabaseConnection from '@/config/database';
import { ModelManager } from '@/models';

export class DatabaseUtils {
  private static sequelize: Sequelize | null = null;

  static async initialize(): Promise<Sequelize> {
    if (DatabaseUtils.sequelize) {
      return DatabaseUtils.sequelize;
    }

    // Get database connection
    DatabaseUtils.sequelize = DatabaseConnection.getInstance();

    // Test connection
    const isConnected = await DatabaseConnection.testConnection();
    if (!isConnected) {
      throw new Error('Failed to establish database connection');
    }

    // Initialize models
    ModelManager.initialize(DatabaseUtils.sequelize);

    // TODO: Replace with proper logging
    // console.log('Database initialization completed successfully');
    return DatabaseUtils.sequelize;
  }

  static async syncDatabase(options: { force?: boolean; alter?: boolean } = {}): Promise<void> {
    if (!DatabaseUtils.sequelize) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    const { force = false, alter = false } = options;

    await DatabaseUtils.sequelize.sync({ force, alter });

    // TODO: Replace with proper logging
    // console.log('Database synchronization completed successfully', {
    //   force,
    //   alter,
    //   tablesCreated: force ? 'all recreated' : 'created if not exists',
    // });
  }

  static async resetDatabase(): Promise<void> {
    if (!DatabaseUtils.sequelize) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    try {
      // TODO: Replace with proper logging
      // console.log('Resetting database...');

      // Drop all tables and recreate
      await DatabaseUtils.syncDatabase({ force: true });

      // Note: Run 'npx sequelize-cli db:seed:all' separately to seed data

      // TODO: Replace with proper logging
      // console.log('Database reset completed successfully');
    } catch (error) {
      console.error('Database reset failed:', error);
      throw error;
    }
  }

  static async closeConnection(): Promise<void> {
    if (DatabaseUtils.sequelize) {
      await ModelManager.close();
      await DatabaseConnection.closeConnection();
      DatabaseUtils.sequelize = null;
      // TODO: Replace with proper logging
      // console.log('Database connection closed');
    }
  }

  static async getStatus(): Promise<{
    connected: boolean;
    modelsInitialized: boolean;
    tableStats: {
      authors: number;
      categories: number;
      books: number;
      bookAuthors: number;
      bookCategories: number;
    };
  }> {
    try {
      const connected = DatabaseUtils.sequelize ? await DatabaseConnection.testConnection() : false;
      const modelsInitialized = ModelManager.isInitialized();

      let tableStats = {
        authors: 0,
        categories: 0,
        books: 0,
        bookAuthors: 0,
        bookCategories: 0,
      };

      if (connected && modelsInitialized) {
        const { Author, Category, Book, BookAuthor, BookCategory } = ModelManager.getModels();

        tableStats = {
          authors: await Author.count(),
          categories: await Category.count(),
          books: await Book.count(),
          bookAuthors: await BookAuthor.count(),
          bookCategories: await BookCategory.count(),
        };
      }

      return {
        connected,
        modelsInitialized,
        tableStats,
      };
    } catch (error) {
      console.error('Error getting database status:', error);
      return {
        connected: false,
        modelsInitialized: false,
        tableStats: {
          authors: 0,
          categories: 0,
          books: 0,
          bookAuthors: 0,
          bookCategories: 0,
        },
      };
    }
  }
}
