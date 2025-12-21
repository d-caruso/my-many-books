// ================================================================
// src/config/database.ts
// ================================================================

import { Sequelize } from 'sequelize';
import { DATABASE_CONFIG } from '@/utils/constants';
import { getLogger } from '@my-many-books/shared-logging';

class DatabaseConnection {
  private static instance: Sequelize | null = null;

  static getInstance(): Sequelize {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = DatabaseConnection.createConnection();
    }
    return DatabaseConnection.instance;
  }

  private static createConnection(): Sequelize {
    const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL, NODE_ENV } = process.env;

    if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
      throw new Error('Missing required database environment variables');
    }

    const parsedPoolMax = Number.parseInt(process.env['DB_POOL_MAX'] || '', 10);
    const parsedPoolMin = Number.parseInt(process.env['DB_POOL_MIN'] || '', 10);
    const poolConfig = {
      ...DATABASE_CONFIG.POOL,
      max: Number.isFinite(parsedPoolMax) ? parsedPoolMax : DATABASE_CONFIG.POOL.max,
      min: Number.isFinite(parsedPoolMin) ? parsedPoolMin : DATABASE_CONFIG.POOL.min,
    };

    const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
      host: DB_HOST,
      port: parseInt(DB_PORT || '3306', 10),
      dialect: DATABASE_CONFIG.DIALECT,
      timezone: DATABASE_CONFIG.TIMEZONE,
      pool: poolConfig,
      dialectOptions: {
        ssl: DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      },
      logging:
        NODE_ENV === 'development'
          ? (msg: string): void => {
              getLogger().debug({ sql: msg }, 'SQL query');
            }
          : false,
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
