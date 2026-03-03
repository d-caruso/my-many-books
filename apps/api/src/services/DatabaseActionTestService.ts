import { getLogger } from '@my-many-books/shared-logging';
import { Sequelize, QueryTypes } from 'sequelize';
import DatabaseConnection from '../config/database';

export interface DatabaseExecutionResult {
  success: boolean;
  error?: string;
  recordId?: number;
}

interface InsertResult {
  id: number;
}

/**
 * Service for testing database action configurations in the Mobile Hooks system.
 *
 * ## Why Raw SQL Instead of Sequelize Models?
 *
 * This service uses raw SQL (`INSERT INTO ${table}`) rather than Sequelize models because:
 *
 * 1. **Admin-configurable table names**: The controller allows admins to configure any
 *    table name via `actionSettings.table` (see `AdminMobileHooksActionsConfigController`).
 *    There is no fixed Sequelize model to call since the target table is dynamic.
 *
 * 2. **Complexity vs. value tradeoff**: Dynamically defining or bootstrapping a Sequelize
 *    model per table at runtime would be more complicated and brittle than issuing a
 *    direct `INSERT INTO ${table}` with prepared values.
 *
 * 3. **Test-only nature**: This endpoint exists solely for admins to verify their database
 *    action configuration works. The lightweight raw SQL approach matches this limited scope.
 *
 * ## Where does the table name come from?
 *
 * - Default: `'mobile_analytics'`
 * - Configured via: Admin panel → Action Configuration → Database action type
 * - Stored in: `mobile.hooks.actions.settings.database.table`
 * - UI: `apps/web-app/src/pages/Admin/MobileHooks/components/configuration/ActionSettingsForm.tsx`
 *
 * @see AdminMobileHooksActionsConfigController for the controller that uses this service
 */
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
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

let instance: DatabaseActionTestService | undefined;

export const databaseActionTestService = {
  insertTestRecord(table: string, payload: Record<string, unknown>): Promise<DatabaseExecutionResult> {
    if (!instance) {
      instance = new DatabaseActionTestService(DatabaseConnection.getInstance());
    }
    return instance.insertTestRecord(table, payload);
  },
};
