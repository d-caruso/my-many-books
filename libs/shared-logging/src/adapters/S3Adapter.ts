/**
 * S3 adapter for archiving logs to AWS S3
 */

import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { gzipSync } from 'zlib';
import { BaseAdapter } from './BaseAdapter';
import { LogEntry } from '../interfaces/LogEntry';
import { StorageAdapterConfig } from '../interfaces/LogStorage';

/**
 * Configuration for S3 adapter
 */
export interface S3AdapterConfig extends StorageAdapterConfig {
  /**
   * S3 bucket name
   */
  bucketName: string;

  /**
   * AWS region
   */
  region: string;

  /**
   * Key prefix (folder path in S3)
   * @default 'logs/'
   */
  keyPrefix?: string;

  /**
   * Whether to compress logs with gzip
   * @default true
   */
  compress?: boolean;

  /**
   * Buffer size before flushing to S3
   * @default 1000
   */
  bufferSize?: number;

  /**
   * Flush interval in milliseconds
   * @default 300000 (5 minutes)
   */
  flushInterval?: number;
}

/**
 * S3 storage adapter for log archival
 *
 * Features:
 * - Automatic buffering and batching
 * - Gzip compression
 * - Organized by date (YYYY/MM/DD structure)
 * - Periodic flushing
 * - Retry with exponential backoff
 */
export class S3Adapter extends BaseAdapter {
  readonly name = 's3';
  private readonly client: S3Client;
  private readonly s3Config: S3AdapterConfig;
  private buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: S3AdapterConfig) {
    super(config);
    this.s3Config = {
      ...config,
      keyPrefix: config.keyPrefix || 'logs/',
      compress: config.compress !== false,
      bufferSize: config.bufferSize || 1000,
      flushInterval: config.flushInterval || 300000, // 5 minutes
    };

    this.client = new S3Client({
      region: this.s3Config.region,
    });

    // Start automatic flush timer
    this.startFlushTimer();
  }

  /**
   * Write log entries to buffer
   */
  async write(logs: LogEntry[]): Promise<void> {
    if (!this.isEnabled()) return;
    if (logs.length === 0) return;

    this.buffer.push(...logs);

    // Flush if buffer is full
    if (this.buffer.length >= (this.s3Config.bufferSize || 1000)) {
      await this.flush();
    }
  }

  /**
   * Flush buffered logs to S3
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logsToFlush = this.buffer.splice(0);

    try {
      await this.retry(() => this.uploadToS3(logsToFlush));
    } catch (error) {
      this.logError(
        'Failed to flush logs to S3:',
        error instanceof Error ? error.message : String(error)
      );
      // Re-add logs to buffer for retry
      this.buffer.unshift(...logsToFlush);
    }
  }

  /**
   * Check if S3 bucket is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.send(
        new HeadBucketCommand({
          Bucket: this.s3Config.bucketName,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Final flush
    await this.flush();
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        this.logError('Flush timer error:', error);
      });
    }, this.s3Config.flushInterval);

    // Don't keep process alive for this timer
    this.flushTimer.unref();
  }

  /**
   * Upload logs to S3
   */
  private async uploadToS3(logs: LogEntry[]): Promise<void> {
    if (logs.length === 0) return;

    // Generate S3 key with date structure
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const timestamp = now.getTime();

    const key = `${this.s3Config.keyPrefix}${year}/${month}/${day}/logs-${timestamp}.json${this.s3Config.compress ? '.gz' : ''}`;

    // Convert logs to JSON
    const content = JSON.stringify(logs, null, 2);

    // Compress if enabled
    const body = this.s3Config.compress
      ? gzipSync(Buffer.from(content, 'utf-8'))
      : content;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: this.s3Config.bucketName,
      Key: key,
      Body: body,
      ContentType: this.s3Config.compress
        ? 'application/gzip'
        : 'application/json',
      Metadata: {
        logCount: String(logs.length),
        compressed: String(this.s3Config.compress),
      },
    });

    await this.client.send(command);
    this.logInfo(`Uploaded ${logs.length} logs to S3: ${key}`);
  }
}
