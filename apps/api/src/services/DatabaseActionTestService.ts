import { getLogger } from '@my-many-books/shared-logging';
import { Sequelize } from 'sequelize';
import { MobileHookActionExecution } from '../models';

interface DatabaseExecutionResult {
  success: boolean;
  error?: string;
  recordId?: number;
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
          type: this.sequelize.QueryTypes.INSERT,
        }
      );

      const id = Array.isArray(result) && typeof result[0] === 'object' ? (result[0] as any).id : undefined;

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

export const databaseActionTestService = new DatabaseActionTestService(require('../config/database').default.getInstance());
