import { mkdir, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { HookAction, HookActionContext } from '../types';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogDestination = 'console' | 'file';

export interface LogActionOptions {
  prefix?: string;
  level?: LogLevel;
  destination?: LogDestination;
  filePath?: string;
  includeMetadata?: boolean;
}

const levelToConsoleMethod: Record<LogLevel, keyof Console> = {
  info: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
};

export class LogAction implements HookAction {
  private readonly prefix: string;
  private readonly level: LogLevel;
  private readonly destination: LogDestination;
  private readonly filePath?: string;
  private readonly includeMetadata: boolean;

  constructor(config?: string | LogActionOptions) {
    if (typeof config === 'string') {
      this.prefix = config;
      this.level = 'info';
      this.destination = 'console';
      this.filePath = undefined;
      this.includeMetadata = true;
      return;
    }

    const options = config ?? {};
    this.prefix = options.prefix ?? 'hook';
    this.level = options.level ?? 'info';
    this.destination = options.destination ?? 'console';
    this.filePath = options.filePath;
    this.includeMetadata = options.includeMetadata ?? true;
  }

  async execute(context: HookActionContext): Promise<void> {
    const message = this.buildMessage(context.eventName);
    const payload = this.includeMetadata ? context.payload : undefined;

    this.logToConsole(message, payload);

    if (this.destination === 'file' && this.filePath) {
      await this.logToFile(message, payload);
    }
  }

  private buildMessage(eventName: string): string {
    return `[${this.prefix}] event=${eventName}`;
  }

  private logToConsole(message: string, payload?: unknown): void {
    const method = levelToConsoleMethod[this.level];
    const consoleMethod =
      typeof console[method] === 'function'
        ? (console[method] as (...args: unknown[]) => void)
        : console.log.bind(console);

    if (payload !== undefined) {
      consoleMethod(message, payload);
      return;
    }

    consoleMethod(message);
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
      console.warn(
        `[${this.prefix}] Failed to write log file at ${this.filePath}:`,
        error
      );
    }
  }

  private safeSerialize(payload: unknown): string {
    try {
      return JSON.stringify(payload);
    } catch {
      return '[unserializable payload]';
    }
  }
}
