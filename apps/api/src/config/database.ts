// ================================================================
// src/config/database.ts
// ================================================================

import { Sequelize } from 'sequelize';
import { DATABASE_CONFIG } from '@/utils/constants';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

class DatabaseConnection {
  private static instance: Sequelize | null = null;
  private static secretsCache: { password?: string } = {};

  static getInstance(): Sequelize {
    if (!DatabaseConnection.instance) {
      throw new Error('Database not initialized. Call initializeAsync() first.');
    }
    return DatabaseConnection.instance;
  }

  static async initializeAsync(): Promise<Sequelize> {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = await DatabaseConnection.createConnection();
    }
    return DatabaseConnection.instance;
  }

  private static async getDbPassword(): Promise<string> {
    // If DB_PASSWORD is set in env (local dev), use it
    if (process.env.DB_PASSWORD) {
      return process.env.DB_PASSWORD;
    }

    // Otherwise, fetch from Secrets Manager (AWS Lambda)
    if (DatabaseConnection.secretsCache.password) {
      return DatabaseConnection.secretsCache.password;
    }

    const secretName = `my-many-books-infrastructure-${process.env.NODE_ENV || 'dev'}-db-credentials`;
    const region = process.env.AWS_REGION || 'us-west-2';

    try {
      const client = new SecretsManagerClient({ region });
      const response = await client.send(
        new GetSecretValueCommand({
          SecretId: secretName,
        })
      );

      if (!response.SecretString) {
        throw new Error('Secret value is empty');
      }

      const secret = JSON.parse(response.SecretString);
      DatabaseConnection.secretsCache.password = secret.password;
      return secret.password;
    } catch (error) {
      console.error('Failed to fetch DB password from Secrets Manager:', error);
      throw new Error('Unable to retrieve database credentials');
    }
  }

  private static async createConnection(): Promise<Sequelize> {
    const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_SSL, NODE_ENV } = process.env;

    if (!DB_HOST || !DB_NAME || !DB_USER) {
      throw new Error('Missing required database environment variables');
    }

    const password = await DatabaseConnection.getDbPassword();

    const sequelize = new Sequelize(DB_NAME, DB_USER, password, {
      host: DB_HOST,
      port: parseInt(DB_PORT || '3306', 10),
      dialect: DATABASE_CONFIG.DIALECT,
      timezone: DATABASE_CONFIG.TIMEZONE,
      pool: DATABASE_CONFIG.POOL,
      dialectOptions: {
        ssl: DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      },
      logging:
        NODE_ENV === 'development'
          ? (_msg: string): void => {
              // TODO: Replace with proper logging
              // console.log(_msg);
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
      // TODO: Replace with proper logging
      // console.log('Database connection established successfully');
      return true;
    } catch {
      // TODO: Replace with proper logging
      // console.error('Unable to connect to database:', _error);
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
