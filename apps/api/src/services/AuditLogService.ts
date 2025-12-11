/**
 * AuditLogService - Service for logging audit events
 *
 * Integrates with shared-logging library to provide:
 * - Immediate logging to Pino (CloudWatch)
 * - Async persistence to database via Bull queue
 * - TraceId correlation
 */

import { Request } from 'express';
import pino from 'pino';
import Queue from 'bull';
import {
  AuditLogEntry,
  createPinoConfig,
  getTraceIdFromRequest,
} from '@my-many-books/shared-logging';
import { AuditLog } from '../models';

/**
 * Data for creating an audit log
 */
export interface AuditLogData {
  userId: number;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, any>;
  req?: Request;
}

/**
 * AuditLogService handles logging of user actions
 *
 * Features:
 * - Logs to Pino immediately (CloudWatch/console)
 * - Queues database persistence (async, non-blocking)
 * - Captures IP address and user agent
 * - Includes traceId for correlation
 */
export class AuditLogService {
  private logger: pino.Logger;
  private queue: Queue.Queue;

  constructor() {
    // Initialize Pino logger
    this.logger = pino(createPinoConfig());

    // Initialize Bull queue for async database writes
    this.queue = new Queue('audit-logs', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    // Set up queue processor
    this.setupQueueProcessor();
  }

  /**
   * Log an audit event
   *
   * This method:
   * 1. Logs immediately to Pino (for CloudWatch/console)
   * 2. Queues database persistence (async, non-blocking)
   *
   * @param data - Audit log data
   */
  async logAction(data: AuditLogData): Promise<void> {
    const traceId = data.req ? getTraceIdFromRequest(data.req) : 'unknown';

    const auditLog: AuditLogEntry = {
      type: 'audit',
      timestamp: new Date(),
      level: 'info',
      message: `${data.action} ${data.resourceType}`,
      traceId,
      service: 'api',
      userId: String(data.userId),
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      ipAddress: data.req?.ip,
      userAgent: data.req?.get('user-agent'),
      details: data.details,
      metadata: {},
    };

    // 1. Log immediately to Pino
    this.logger.info(auditLog, 'Audit event');

    // 2. Queue database persistence (fire-and-forget)
    try {
      await this.queue.add('persist', auditLog);
    } catch (error) {
      this.logger.error(
        { err: error },
        'Failed to queue audit log for database persistence'
      );
    }
  }

  /**
   * Query audit logs from database
   *
   * @param filter - Query filters
   * @returns Audit log entries
   */
  async query(filter: {
    userId?: number;
    resourceType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    const where: any = {};

    if (filter.userId) {
      where.userId = filter.userId;
    }

    if (filter.resourceType) {
      where.resourceType = filter.resourceType;
    }

    if (filter.action) {
      where.action = filter.action;
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    return await AuditLog.findAll({
      where,
      limit: filter.limit || 100,
      offset: filter.offset || 0,
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Set up queue processor to persist audit logs to database
   */
  private setupQueueProcessor(): void {
    this.queue.process('persist', async (job) => {
      const auditLog: AuditLogEntry = job.data;

      try {
        await AuditLog.create({
          userId: parseInt(auditLog.userId),
          action: auditLog.action,
          resourceType: auditLog.resourceType,
          resourceId: auditLog.resourceId,
          details: auditLog.details,
          ipAddress: auditLog.ipAddress,
          userAgent: auditLog.userAgent,
          createdAt: auditLog.timestamp,
        });
      } catch (error) {
        this.logger.error(
          { err: error, auditLog },
          'Failed to persist audit log to database'
        );
        throw error; // Bull will retry
      }
    });

    // Log queue events
    this.queue.on('failed', (job, err) => {
      this.logger.error(
        { jobId: job?.id, err },
        'Audit log persistence job failed'
      );
    });

    this.queue.on('completed', (job) => {
      this.logger.debug({ jobId: job.id }, 'Audit log persisted to database');
    });
  }

  /**
   * Close queue connections (for graceful shutdown)
   */
  async close(): Promise<void> {
    await this.queue.close();
  }
}

// Singleton instance
let auditLogServiceInstance: AuditLogService | null = null;

/**
 * Get the singleton AuditLogService instance
 */
export function getAuditLogService(): AuditLogService {
  if (!auditLogServiceInstance) {
    auditLogServiceInstance = new AuditLogService();
  }
  return auditLogServiceInstance;
}
