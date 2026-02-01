import { getLogger } from '@my-many-books/shared-logging';
import { Sequelize, QueryTypes } from 'sequelize';
import DatabaseConnection from '../config/database';

interface DatabaseExecutionResult {
  success: boolean;
  error?: string;
  recordId?: number;
}

interface InsertResult {
  id: number;
}

export class DatabaseActionTestService {
  private readonly logger = getLogger();
  private readonly sequelize: Sequelize;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }

  async insertTestRecord(table: string, payload: Record<string, unknown>): Promise<DatabaseExecutionResult> {
    try {
      const result = await this.sequelize.query(
        `INSERT INTO ${table} (payload, createdAt, updatedAt) VALUES (:payload, NOW(), NOW()) RETURNING id`,
        {
          replacements: { payload: JSON.stringify(payload) },
          type: QueryTypes.INSERT,
        }
      );

      const id = Array.isArray(result) &&
                 result[0] &&
                 typeof result[0] === 'object' &&
                 'id' in result[0]
        ? (result[0] as InsertResult).id
        : undefined;

      return {
        success: true,
        recordId: id,
      };
    } catch (error) {
      this.logger.warn({ err: error, table }, 'Database action test failed');
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}

export const databaseActionTestService = new DatabaseActionTestService(DatabaseConnection.getInstance());
