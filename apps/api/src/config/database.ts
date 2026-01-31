// ================================================================
// src/config/database.ts
// ================================================================

import { Sequelize } from 'sequelize';
import { DATABASE_CONFIG } from '@/utils/constants';
import { getLogger } from '@my-many-books/shared-logging';

class DatabaseConnection {
  private static instance: Sequelize | null = null;
  private static connectionFactory: () => Sequelize = DatabaseConnection.createDefaultConnection;

  static getInstance(): Sequelize {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = DatabaseConnection.connectionFactory();
    }
    return DatabaseConnection.instance;
  }

  static setConnectionFactory(factory: () => Sequelize): void {
    DatabaseConnection.connectionFactory = factory;
    DatabaseConnection.instance = null;
  }

  static resetConnectionFactory(): void {
    DatabaseConnection.connectionFactory = DatabaseConnection.createDefaultConnection;
    DatabaseConnection.instance = null;
  }

  private static createDefaultConnection(): Sequelize {
    const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL } = process.env;
    const isTestEnv = process.env['NODE_ENV'] === 'test';

    if (!isTestEnv && (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD)) {
      throw new Error('Missing required database environment variables');
    }

    if (isTestEnv) {
      const testUri = process.env['DB_TEST_URI'] || 'sqlite::memory:';
      return new Sequelize(testUri, {
        dialect: 'sqlite',
        storage: process.env['DB_TEST_STORAGE'] || ':memory:',
        logging: false,
      });
    }

    const parsedPoolMax = Number.parseInt(process.env['DB_POOL_MAX'] || '', 10);
    const parsedPoolMin = Number.parseInt(process.env['DB_POOL_MIN'] || '', 10);
    const poolConfig = {
      ...DATABASE_CONFIG.POOL,
      max: Number.isFinite(parsedPoolMax) ? parsedPoolMax : DATABASE_CONFIG.POOL.max,
      min: Number.isFinite(parsedPoolMin) ? parsedPoolMin : DATABASE_CONFIG.POOL.min,
    };

    const sequelize = new Sequelize(DB_NAME!, DB_USER!, DB_PASSWORD!, {
      host: DB_HOST,
      port: parseInt(DB_PORT || '3306', 10),
      dialect: DATABASE_CONFIG.DIALECT,
      timezone: DATABASE_CONFIG.TIMEZONE,
      pool: poolConfig,
      dialectOptions: {
        ssl: DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      },
      logging: false, // Disabled for cleaner E2E test logs
      define: {
        timestamps: true,
        underscored: true,
        createdAt: 'creation_date',
        updatedAt: 'update_date',
      },
    });

    return sequelize;
  }

  static async testConnection(): Promise<boolean> {
    try {
      const sequelize = DatabaseConnection.getInstance();
      await sequelize.authenticate();
      getLogger().info('Database connection test successful');
      return true;
    } catch (error) {
      getLogger().error(
        {
          err: error instanceof Error ? error : new Error(String(error)),
        },
        'Unable to connect to database'
      );
      return false;
    }
  }

  static async closeConnection(): Promise<void> {
    if (DatabaseConnection.instance) {
      await DatabaseConnection.instance.close();
      DatabaseConnection.instance = null;
    }
  }
}

export default DatabaseConnection;
