import { HookAction, HookActionContext } from '../types';
import { replaceTemplateVariables } from '../utils/templateEngine';

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

/**
 * Default database service implementation
 * This is a mock implementation that logs operations to console
 * In production, replace with actual database service (Sequelize, TypeORM, Prisma, etc.)
 */
export class ConsoleDatabaseService implements DatabaseService {
  async create(table: string, data: Record<string, unknown>): Promise<unknown> {
    console.log('[DatabaseService] CREATE');
    console.log('  Table:', table);
    console.log('  Data:', JSON.stringify(data, null, 2));
    return { id: 'mock-id', ...data };
  }

  async update(
    table: string,
    data: Record<string, unknown>,
    where: Record<string, unknown>
  ): Promise<unknown> {
    console.log('[DatabaseService] UPDATE');
    console.log('  Table:', table);
    console.log('  Data:', JSON.stringify(data, null, 2));
    console.log('  Where:', JSON.stringify(where, null, 2));
    return { affected: 1 };
  }

  async delete(table: string, where: Record<string, unknown>): Promise<unknown> {
    console.log('[DatabaseService] DELETE');
    console.log('  Table:', table);
    console.log('  Where:', JSON.stringify(where, null, 2));
    return { deleted: 1 };
  }
}

export class DatabaseAction implements HookAction {
  constructor(
    private readonly config: DatabaseActionConfig,
    private readonly dbService: DatabaseService = new ConsoleDatabaseService()
  ) {}

  async execute(context: HookActionContext): Promise<void> {
    // Extract data from context payload
    const payloadData = (context.payload as Record<string, unknown>) || {};

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
        throw new Error(`Unknown database operation: ${this.config.operation}`);
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
