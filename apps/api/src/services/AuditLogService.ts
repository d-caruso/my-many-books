/**
 * AuditLogService - Service for logging audit events
 *
 * Integrates with shared-logging library to provide:
 * - Immediate logging to Pino (CloudWatch)
 * - Async persistence to database via Bull queue
 * - TraceId correlation
 */

import pino from 'pino';
import { AuditLogEntry, createPinoConfig } from '@my-many-books/shared-logging';
import { AuditLog, AuditLogCreationAttributes } from '../models';
import { UniversalRequest } from '../types';

/**
 * Data for creating an audit log
 */
export interface AuditLogData {
  userId: number;
  role?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  traceId?: string;
}

/**
 * AuditLogService handles logging of user actions
 *
 * Features:
 * - Logs to Pino immediately (CloudWatch/console)
 * - Async database persistence (fire-and-forget)
 * - Captures IP address, user agent, and role
 * - Includes traceId for correlation
 * - Switchable via environment variables and database setting
 */
export class AuditLogService {
  private logger: pino.Logger;
  private cachedEnabled: boolean | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor() {
    // Initialize Pino logger
    this.logger = pino(createPinoConfig());
  }

  /**
   * Check if audit logging is enabled
   *
   * Hierarchical precedence:
   * 1. AUDIT_LOGGING_FORCE_DISABLED=true → Always OFF
   * 2. AUDIT_LOGGING_FORCE_ENABLED=true → Always ON
   * 3. Database setting (future implementation)
   * 4. Default: true (enabled)
   *
   * @returns true if audit logging is enabled
   */
  async isEnabled(): Promise<boolean> {
    // 1. Check FORCE_DISABLED (highest priority)
    if (process.env['AUDIT_LOGGING_FORCE_DISABLED'] === 'true') {
      return false;
    }

    // 2. Check FORCE_ENABLED (second priority)
    if (process.env['AUDIT_LOGGING_FORCE_ENABLED'] === 'true') {
      return true;
    }

    // 3. Check database setting (with cache)
    // TODO: Implement database setting in Task 3.7
    // For now, check cache
    const now = Date.now();
    if (this.cachedEnabled !== null && now < this.cacheExpiry) {
      return this.cachedEnabled;
    }

    // 4. Default: enabled
    const enabled = true;
    this.cachedEnabled = enabled;
    this.cacheExpiry = now + this.CACHE_TTL;
    return enabled;
  }

  /**
   * Invalidate the enabled cache
   * Call this when database setting changes
   */
  invalidateCache(): void {
    this.cachedEnabled = null;
    this.cacheExpiry = 0;
  }

  /**
   * Log an audit event
   *
   * This method:
   * 1. Logs immediately to Pino (for CloudWatch/console)
   * 2. Persists to database (async, fire-and-forget)
   *
   * @param data - Audit log data
   */
  async logAction(data: AuditLogData): Promise<void> {
    const traceId = data.traceId ?? 'unknown';

    const auditLog: Partial<AuditLogEntry> & {
      type: 'audit';
      timestamp: Date;
      level: 'info';
      message: string;
      traceId: string;
      service: string;
      userId: string;
      action: string;
      resourceType: string;
      resourceId: string;
      metadata: Record<string, unknown>;
    } = {
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
      metadata: {},
    };

    if (data.role) {
      (auditLog as any).role = data.role;
    }
    if (data.ipAddress) {
      auditLog.ipAddress = data.ipAddress;
    }
    if (data.userAgent) {
      auditLog.userAgent = data.userAgent;
    }
    if (data.details) {
      auditLog.details = data.details;
    }

    // 1. Log immediately to Pino
    this.logger.info(auditLog as AuditLogEntry, 'Audit event');

    // 2. Persist to database (fire-and-forget)
    this.persistToDatabase(auditLog as any).catch(error => {
      this.logger.error({ err: error, auditLog }, 'Failed to persist audit log to database');
    });
  }

  /**
   * Persist audit log to database
   *
   * @param auditLog - Audit log entry to persist
   */
  private async persistToDatabase(auditLog: any): Promise<void> {
    const creationData: Partial<AuditLogCreationAttributes> & {
      userId: number;
      action: string;
      resourceType: string;
      resourceId: string;
    } = {
      userId: parseInt(auditLog.userId),
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      createdAt: auditLog.timestamp,
    };

    if (auditLog.role) {
      creationData.role = auditLog.role;
    }
    if (auditLog.details) {
      creationData.details = auditLog.details;
    }
    if (auditLog.ipAddress) {
      creationData.ipAddress = auditLog.ipAddress;
    }
    if (auditLog.userAgent) {
      creationData.userAgent = auditLog.userAgent;
    }

    await AuditLog.create(creationData as any);
  }

  /**
   * Log an audit event from a UniversalRequest
   *
   * Convenience method that extracts user info and headers from request
   * Respects audit logging enabled/disabled configuration
   *
   * @param request - Universal request object
   * @param action - Action performed (create, update, delete, etc.)
   * @param resourceType - Type of resource (hook, book, user, etc.)
   * @param resourceId - ID of the resource
   * @param details - Additional details about the action
   */
  async logActionFromRequest(
    request: UniversalRequest,
    action: string,
    resourceType: string,
    resourceId: string,
    details?: Record<string, any>
  ): Promise<void> {
    // Check if audit logging is enabled
    if (!(await this.isEnabled())) {
      return;
    }

    const auditData: AuditLogData = {
      userId: request.user?.userId ?? 0,
      action,
      resourceType,
      resourceId,
    };

    if (request.user?.role) {
      auditData.role = request.user.role;
    }

    if (details) {
      auditData.details = details;
    }

    const ipAddress = request.headers?.['x-forwarded-for'] || request.headers?.['x-real-ip'];
    const userAgent = request.headers?.['user-agent'];

    if (ipAddress) {
      auditData.ipAddress = ipAddress;
    }
    if (userAgent) {
      auditData.userAgent = userAgent;
    }

    await this.logAction(auditData);
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
