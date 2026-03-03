/**
 * CloudWatch Logs adapter for storing logs in AWS CloudWatch
 */

import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
  DescribeLogStreamsCommand,
  CreateLogStreamCommand,
  InputLogEvent,
} from '@aws-sdk/client-cloudwatch-logs';
import { BaseAdapter } from './BaseAdapter';
import { LogEntry } from '../interfaces/LogEntry';
import { StorageAdapterConfig } from '../interfaces/LogStorage';

/**
 * Configuration options for CloudWatch adapter
 */
export interface CloudWatchAdapterConfig extends StorageAdapterConfig {
  /**
   * CloudWatch log group name
   */
  logGroupName: string;

  /**
   * CloudWatch log stream name
   */
  logStreamName: string;

  /**
   * AWS region
   */
  region: string;

  /**
   * Buffer size (number of log entries before flushing)
   * @default 100
   */
  bufferSize?: number;

  /**
   * Flush interval in milliseconds
   * @default 1000
   */
  flushInterval?: number;
}

/**
 * CloudWatch Logs storage adapter
 *
 * Features:
 * - Automatic buffering and batching
 * - Periodic flushing
 * - Automatic log stream creation
 * - Retry with exponential backoff
 */
export class CloudWatchAdapter extends BaseAdapter {
  readonly name = 'cloudwatch';
  private readonly client: CloudWatchLogsClient;
  private readonly cloudWatchConfig: CloudWatchAdapterConfig;
  private buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private sequenceToken?: string;

  private static getErrorName(error: unknown): string | null {
    if (typeof error !== 'object' || error === null) {
      return null;
    }

    if (!('name' in error)) {
      return null;
    }

    const { name } = error as { name: unknown };
    return typeof name === 'string' ? name : null;
  }

  constructor(config: CloudWatchAdapterConfig) {
    super(config);
    this.cloudWatchConfig = {
      ...config,
      bufferSize: config.bufferSize || 100,
      flushInterval: config.flushInterval || 1000,
    };

    this.client = new CloudWatchLogsClient({
      region: this.cloudWatchConfig.region,
    });

    // Start automatic flush timer
    this.startFlushTimer();
  }

  /**
   * Write log entries to buffer
   *
   * Logs are buffered and flushed either when:
   * - Buffer reaches bufferSize
   * - Flush interval elapses
   * - flush() is called explicitly
   */
  async write(logs: LogEntry[]): Promise<void> {
    if (!this.isEnabled()) return;
    if (logs.length === 0) return;

    this.buffer.push(...logs);

    // Flush if buffer is full
    if (this.buffer.length >= (this.cloudWatchConfig.bufferSize || 100)) {
      await this.flush();
    }
  }

  /**
   * Flush buffered logs to CloudWatch
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logsToFlush = this.buffer.splice(0);

    try {
      await this.retry(() => this.sendToCloudWatch(logsToFlush));
    } catch (error) {
      this.logError(
        'Failed to flush logs to CloudWatch:',
        error instanceof Error ? error.message : String(error)
      );
      // Re-add logs to buffer for retry
      this.buffer.unshift(...logsToFlush);
    }
  }

  /**
   * Check if CloudWatch is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.send(
        new DescribeLogStreamsCommand({
          logGroupName: this.cloudWatchConfig.logGroupName,
          limit: 1,
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
    }, this.cloudWatchConfig.flushInterval);

    // Don't keep process alive for this timer
    this.flushTimer.unref();
  }

  /**
   * Send logs to CloudWatch
   */
  private async sendToCloudWatch(logs: LogEntry[]): Promise<void> {
    if (logs.length === 0) return;

    // Ensure log stream exists
    await this.ensureLogStream();

    // Convert to CloudWatch format
    const logEvents: InputLogEvent[] = logs.map((log) => ({
      message: JSON.stringify(log),
      timestamp: log.timestamp.getTime(),
    }));

    // Sort by timestamp (required by CloudWatch)
    logEvents.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    try {
      const command = new PutLogEventsCommand({
        logGroupName: this.cloudWatchConfig.logGroupName,
        logStreamName: this.cloudWatchConfig.logStreamName,
        logEvents,
        sequenceToken: this.sequenceToken,
      });

      const response = await this.client.send(command);
      this.sequenceToken = response.nextSequenceToken;
    } catch (error: unknown) {
      const errorName = CloudWatchAdapter.getErrorName(error);
      // If sequence token is invalid, retry without it
      if (
        errorName === 'InvalidSequenceTokenException' ||
        errorName === 'DataAlreadyAcceptedException'
      ) {
        this.sequenceToken = undefined;
        throw error; // Will be retried by retry() method
      }
      throw error;
    }
  }

  /**
   * Ensure log stream exists, create if not
   */
  private async ensureLogStream(): Promise<void> {
    try {
      // Check if stream exists
      const response = await this.client.send(
        new DescribeLogStreamsCommand({
          logGroupName: this.cloudWatchConfig.logGroupName,
          logStreamNamePrefix: this.cloudWatchConfig.logStreamName,
        })
      );

      const stream = response.logStreams?.find(
        (s) => s.logStreamName === this.cloudWatchConfig.logStreamName
      );

      if (stream) {
        this.sequenceToken = stream.uploadSequenceToken;
      } else {
        // Create log stream
        await this.client.send(
          new CreateLogStreamCommand({
            logGroupName: this.cloudWatchConfig.logGroupName,
            logStreamName: this.cloudWatchConfig.logStreamName,
          })
        );
      }
    } catch (error: unknown) {
      const errorName = CloudWatchAdapter.getErrorName(error);
      // Stream might have been created by another process
      if (errorName !== 'ResourceAlreadyExistsException') {
        throw error;
      }
    }
  }
}
