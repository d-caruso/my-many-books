/**
 * Database adapter for storing audit logs in relational database via Sequelize
 */

import { Model, ModelStatic, Op, WhereOptions } from 'sequelize';
import { BaseAdapter } from './BaseAdapter';
import { LogEntry, AuditLogEntry, LogFilter } from '../interfaces/LogEntry';
import { StorageAdapterConfig } from '../interfaces/LogStorage';

/**
 * Interface for audit log database model
 *
 * The model must have these fields at minimum
 */
export interface AuditLogModel {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * Configuration for DatabaseAdapter
 */
export interface DatabaseAdapterConfig extends StorageAdapterConfig {
  /**
   * Sequelize model for audit logs
   */
  model: ModelStatic<Model<AuditLogModel>>;
}

/**
 * Database storage adapter for audit logs
 *
 * Features:
 * - Stores only audit log entries (filters out non-audit logs)
 * - Bulk insert for performance
 * - Query support with filters
 * - Indexed for fast queries
 */
export class DatabaseAdapter extends BaseAdapter {
  readonly name = 'database';
  private readonly model: ModelStatic<Model<AuditLogModel>>;

  constructor(config: DatabaseAdapterConfig) {
    super(config);
    this.model = config.model;
  }

  /**
   * Write log entries to database
   *
   * Only writes audit logs (filters out other log types)
   */
  async write(logs: LogEntry[]): Promise<void> {
    if (!this.isEnabled()) return;

    // Filter to only audit logs
    const auditLogs = logs.filter(
      (log): log is AuditLogEntry => 'type' in log && log.type === 'audit'
    );

    if (auditLogs.length === 0) return;

    try {
      await this.retry(() => this.bulkInsert(auditLogs));
    } catch (error) {
      this.logError(
        'Failed to write audit logs to database:',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Query audit logs from database
   *
   * @param filter - Filter criteria
   * @returns Matching audit log entries
   */
  async query(filter: LogFilter): Promise<AuditLogEntry[]> {
    const where: WhereOptions<AuditLogModel> = {};

    // Build WHERE clause
    if (filter.userId) {
      where['userId'] = filter.userId;
    }

    if (filter.resourceType) {
      where['resourceType'] = filter.resourceType;
    }

    if (filter.action) {
      where['action'] = filter.action;
    }

    if (filter.startDate || filter.endDate) {
      where['createdAt'] = {
        ...(filter.startDate ? { [Op.gte]: filter.startDate } : {}),
        ...(filter.endDate ? { [Op.lte]: filter.endDate } : {}),
      };
    }

    try {
      const results = await this.model.findAll({
        where,
        limit: filter.limit || 100,
        offset: filter.offset || 0,
        order: [['createdAt', 'DESC']],
      });

      return results.map((record) => this.toAuditLogEntry(record));
    } catch (error) {
      this.logError(
        'Failed to query audit logs from database:',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Flush - no-op for database (writes are immediate)
   */
  async flush(): Promise<void> {
    // Database writes are immediate, nothing to flush
  }

  /**
   * Check if database is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try a simple query
      await this.model.findOne({ limit: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Bulk insert audit logs
   */
  private async bulkInsert(auditLogs: AuditLogEntry[]): Promise<void> {
    const records = auditLogs.map((log) => ({
      userId: log.userId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      details: log.details || {},
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.timestamp,
    }));

    await this.model.bulkCreate(records);
  }

  /**
   * Convert database record to AuditLogEntry
   */
  private toAuditLogEntry(record: Model<AuditLogModel>): AuditLogEntry {
    const data = record.get({ plain: true });

    return {
      type: 'audit',
      timestamp: data.createdAt,
      level: 'info',
      message: `${data.action} ${data.resourceType}`,
      traceId: '', // Not stored in DB, would need separate field if needed
      service: 'api',
      metadata: {},
      userId: data.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      details: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    };
  }
}
