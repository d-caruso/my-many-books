import { HookAction, HookActionContext } from '../types';
import { replaceTemplateVariables, toTemplateData } from '../utils/templateEngine';
import { getLogger, type AppLogger } from '@my-many-books/shared-logging';

export type DatabaseOperation = 'create' | 'update' | 'delete';

export interface DatabaseActionConfig {
  operation: DatabaseOperation;
  table: string;
  data?: Record<string, unknown>;
  where?: Record<string, unknown>;
}

export interface DatabaseService {
  create(table: string, data: Record<string, unknown>): Promise<unknown>;
  update(table: string, data: Record<string, unknown>, where: Record<string, unknown>): Promise<unknown>;
  delete(table: string, where: Record<string, unknown>): Promise<unknown>;
}

const DATABASE_LOG_PREFIX = '[DatabaseService]';
const DATABASE_ACTIONS = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
});

function assertNever(value: never): never {
  throw new Error(`Unknown database operation: ${String(value)}`);
}

/**
 * Default database service implementation
 * This is a mock implementation that logs operations through shared logging
 * In production, replace with actual database service (Sequelize, TypeORM, Prisma, etc.)
 */
export class ConsoleDatabaseService implements DatabaseService {
  private readonly logger: AppLogger;

  constructor(logger: AppLogger = getLogger()) {
    this.logger = logger;
  }

  create(table: string, data: Record<string, unknown>): Promise<unknown> {
    this.logger.info(
      { table, data },
      `${DATABASE_LOG_PREFIX} ${DATABASE_ACTIONS.CREATE}`
    );
    return Promise.resolve({ id: 'mock-id', ...data });
  }

  update(
    table: string,
    data: Record<string, unknown>,
    where: Record<string, unknown>
  ): Promise<unknown> {
    this.logger.info(
      { table, data, where },
      `${DATABASE_LOG_PREFIX} ${DATABASE_ACTIONS.UPDATE}`
    );
    return Promise.resolve({ affected: 1 });
  }

  delete(table: string, where: Record<string, unknown>): Promise<unknown> {
    this.logger.info(
      { table, where },
      `${DATABASE_LOG_PREFIX} ${DATABASE_ACTIONS.DELETE}`
    );
    return Promise.resolve({ deleted: 1 });
  }
}

export class DatabaseAction implements HookAction {
  constructor(
    private readonly config: DatabaseActionConfig,
    private readonly dbService: DatabaseService = new ConsoleDatabaseService()
  ) {}

  async execute(context: HookActionContext): Promise<void> {
    // Extract data from context payload
    const payloadData = toTemplateData(context.payload);

    switch (this.config.operation) {
      case 'create':
        await this.executeCreate(payloadData);
        break;
      case 'update':
        await this.executeUpdate(payloadData);
        break;
      case 'delete':
        await this.executeDelete(payloadData);
        break;
      default:
        assertNever(this.config.operation);
    }
  }

  private async executeCreate(payloadData: Record<string, unknown>): Promise<void> {
    if (!this.config.data) {
      throw new Error('Create operation requires data field');
    }

    // Replace template variables in data values
    const processedData = this.processDataFields(this.config.data, payloadData);

    await this.dbService.create(this.config.table, processedData);
  }

  private async executeUpdate(payloadData: Record<string, unknown>): Promise<void> {
    if (!this.config.data) {
      throw new Error('Update operation requires data field');
    }
    if (!this.config.where) {
      throw new Error('Update operation requires where field');
    }

    // Replace template variables in data and where values
    const processedData = this.processDataFields(this.config.data, payloadData);
    const processedWhere = this.processDataFields(this.config.where, payloadData);

    await this.dbService.update(this.config.table, processedData, processedWhere);
  }

  private async executeDelete(payloadData: Record<string, unknown>): Promise<void> {
    if (!this.config.where) {
      throw new Error('Delete operation requires where field');
    }

    // Replace template variables in where values
    const processedWhere = this.processDataFields(this.config.where, payloadData);

    await this.dbService.delete(this.config.table, processedWhere);
  }

  /**
   * Process data fields to replace template variables
   * Only processes string values; other types are kept as-is
   */
  private processDataFields(
    fields: Record<string, unknown>,
    payloadData: Record<string, unknown>
  ): Record<string, unknown> {
    const processed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === 'string') {
        processed[key] = replaceTemplateVariables(value, payloadData);
      } else {
        processed[key] = value;
      }
    }

    return processed;
  }
}
