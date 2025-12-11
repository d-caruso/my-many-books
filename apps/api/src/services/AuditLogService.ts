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
import { AuditLog, AuditLogAttributes, AuditLogCreationAttributes, Setting } from '../models';
import { UniversalRequest } from '../types';

/**
 * Data for creating an audit log
 */
export interface AuditLogData {
  userId: number;
  role: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  traceId?: string;
}

/**
 * Filter for querying audit logs
 */
export interface AuditLogQueryFilter {
  userId?: number;
  resourceType?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
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
    const now = Date.now();
    if (this.cachedEnabled !== null && now < this.cacheExpiry) {
      return this.cachedEnabled;
    }

    // Query database for setting
    try {
      const setting = await Setting.findOne({ where: { key: 'audit_logging_enabled' } });
      if (setting) {
        const enabled = setting.value === 'true';
        this.cachedEnabled = enabled;
        this.cacheExpiry = now + this.CACHE_TTL;
        return enabled;
      }
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to query audit logging setting from database');
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
  logAction(data: AuditLogData): void {
    const traceId = data.traceId ?? 'unknown';

    const auditLogEntry: AuditLogEntry = {
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
      metadata: {
        role: data.role,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        details: data.details,
      },
    };

    const persistData: AuditLogData = {
      userId: data.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      role: data.role,
      ipAddress: data.ipAddress,
    };

    if (data.details) {
      persistData.details = data.details;
    }

    if (data.userAgent) {
      persistData.userAgent = data.userAgent;
    }

    // 1. Log immediately to Pino
    this.logger.info(auditLogEntry, 'Audit event');

    // 2. Persist to database (fire-and-forget)
    void this.persistToDatabase(persistData).catch((error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));

      this.logger.error({ err, persistData }, 'Failed to persist audit log to database');
    });
  }

  /**
   * Persist audit log to database
   *
   * @param auditLog - Audit log entry to persist
   */
  private async persistToDatabase(auditLog: AuditLogData): Promise<void> {
    const creationData: AuditLogCreationAttributes = {
      userId: auditLog.userId,
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      role: auditLog.role,
      details: auditLog.details,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
    } as AuditLogCreationAttributes;

    await AuditLog.create(creationData as AuditLogAttributes);
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
  logActionFromRequest(
    request: UniversalRequest,
    action: string,
    resourceType: string,
    resourceId: string,
    details?: Record<string, unknown>
  ): void {
    // Check if audit logging is enabled
    void this.isEnabled()
      .then(isEnabled => {
        if (!isEnabled) return;

        const user = request.user as { userId: number; role: string };

        const auditData: AuditLogData = {
          userId: user.userId,
          role: user.role,
          action,
          resourceType,
          resourceId,
          ipAddress:
            request.headers?.['x-forwarded-for'] || request.headers?.['x-real-ip'] || 'none',
        };

        if (details) {
          auditData.details = details;
        }

        const userAgent = request.headers?.['user-agent'];
        if (userAgent) {
          auditData.userAgent = userAgent;
        }

        this.logAction(auditData); //fire-and-forget
      })
      .catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error({ err }, 'Audit log: isEnabled() failed');
      });
  }

  /**
   * Query audit logs from database
   *
   * @param filter - Query filters
   * @returns Audit log entries
   */
  async query(filter: AuditLogQueryFilter): Promise<AuditLog[]> {
    type CreatedAtFilter = {
      gte?: Date;
      lte?: Date;
    };

    const where: Omit<Partial<AuditLogAttributes>, 'createdAt'> & {
      createdAt?: CreatedAtFilter;
    } = {};

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
      const createdAt: CreatedAtFilter = {};

      if (filter.startDate) {
        createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        createdAt.lte = filter.endDate;
      }

      where.createdAt = createdAt;
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
