/**
 * Log entry types and interfaces
 */

/**
 * Log level severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Base log entry structure
 */
export interface LogEntry {
  /**
   * Timestamp when the log was created
   */
  timestamp: Date;

  /**
   * Log severity level
   */
  level: LogLevel;

  /**
   * Human-readable log message
   */
  message: string;

  /**
   * Unique trace ID for correlating logs across services
   */
  traceId: string;

  /**
   * Service name that generated the log
   */
  service: string;

  /**
   * Additional structured metadata
   */
  metadata: Record<string, any>;
}

/**
 * Audit log entry for business events requiring compliance tracking
 */
export interface AuditLogEntry extends LogEntry {
  /**
   * Discriminator for audit logs
   */
  type: 'audit';

  /**
   * ID of the user who performed the action
   */
  userId: string;

  /**
   * Action performed (e.g., "create", "update", "delete")
   */
  action: string;

  /**
   * Type of resource affected (e.g., "book", "user", "hook")
   */
  resourceType: string;

  /**
   * ID of the specific resource affected
   */
  resourceId: string;

  /**
   * IP address of the client (optional)
   */
  ipAddress?: string;

  /**
   * User agent string from the request (optional)
   */
  userAgent?: string;

  /**
   * Additional details about the action (optional)
   */
  details?: Record<string, any>;
}

/**
 * Filter criteria for querying logs
 */
export interface LogFilter {
  /**
   * Filter by user ID
   */
  userId?: string;

  /**
   * Filter by resource type
   */
  resourceType?: string;

  /**
   * Filter by action
   */
  action?: string;

  /**
   * Filter logs from this date onwards
   */
  startDate?: Date;

  /**
   * Filter logs up to this date
   */
  endDate?: Date;

  /**
   * Maximum number of results to return
   */
  limit?: number;

  /**
   * Number of results to skip (for pagination)
   */
  offset?: number;

  /**
   * Filter by log level
   */
  level?: LogLevel;

  /**
   * Filter by trace ID
   */
  traceId?: string;
}
