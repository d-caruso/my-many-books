import { mkdir, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { HookAction, HookActionContext } from '../types';
import { getLogger, type AppLogger } from '@my-many-books/shared-logging';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogDestination = 'console' | 'file';

export interface LogActionOptions {
  prefix?: string;
  level?: LogLevel;
  destination?: LogDestination;
  filePath?: string;
  includeMetadata?: boolean;
}

const FALLBACK_UNSERIALIZABLE_PAYLOAD = '[unserializable payload]';

export class LogAction implements HookAction {
  private readonly prefix: string;
  private readonly level: LogLevel;
  private readonly destination: LogDestination;
  private readonly filePath?: string;
  private readonly includeMetadata: boolean;
  private readonly logger: AppLogger;

  constructor(config?: string | LogActionOptions) {
    if (typeof config === 'string') {
      this.prefix = config;
      this.level = 'info';
      this.destination = 'console';
      this.filePath = undefined;
      this.includeMetadata = true;
      this.logger = getLogger();
      return;
    }

    const options = config ?? {};
    this.prefix = options.prefix ?? 'hook';
    this.level = options.level ?? 'info';
    this.destination = options.destination ?? 'console';
    this.filePath = options.filePath;
    this.includeMetadata = options.includeMetadata ?? true;
    this.logger = getLogger();
  }

  async execute(context: HookActionContext): Promise<void> {
    const message = this.buildMessage(context.eventName);
    const payload = this.includeMetadata ? context.payload : undefined;

    if (payload !== undefined) {
      this.logger[this.level]({ payload }, message);
    } else {
      this.logger[this.level](message);
    }

    if (this.destination === 'file' && this.filePath) {
      await this.logToFile(message, payload);
    }
  }

  private buildMessage(eventName: string): string {
    return `[${this.prefix}] event=${eventName}`;
  }

  private async logToFile(message: string, payload?: unknown): Promise<void> {
    if (!this.filePath) {
      return;
    }

    const serializedPayload =
      payload !== undefined ? ` ${this.safeSerialize(payload)}` : '';
    const line = `${new Date().toISOString()} ${message}${serializedPayload}\n`;

    try {
      await mkdir(dirname(this.filePath), { recursive: true });
      await appendFile(this.filePath, line, 'utf8');
    } catch (error) {
      this.logger.warn(
        { err: error, filePath: this.filePath },
        `[${this.prefix}] Failed to write log file`
      );
    }
  }

  private safeSerialize(payload: unknown): string {
    try {
      return JSON.stringify(payload);
    } catch {
      return FALLBACK_UNSERIALIZABLE_PAYLOAD;
    }
  }
}
