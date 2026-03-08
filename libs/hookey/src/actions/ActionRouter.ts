import { HookAction } from '../types';
import { LogAction, LogActionOptions } from './LogAction';
import {
  EmailAction,
  EmailActionConfig,
  EmailService,
  ConsoleEmailService,
} from './EmailAction';
import {
  DatabaseAction,
  DatabaseActionConfig,
  DatabaseService,
  ConsoleDatabaseService,
} from './DatabaseAction';

export type ActionType = 'log' | 'email' | 'database';

export interface ActionServices {
  emailService?: EmailService;
  databaseService?: DatabaseService;
}

/**
 * Action Router
 * Routes action type and config to the appropriate action executor
 */
export class ActionRouter {
  private readonly emailService: EmailService;
  private readonly databaseService: DatabaseService;

  constructor(services?: ActionServices) {
    this.emailService = services?.emailService || new ConsoleEmailService();
    this.databaseService = services?.databaseService || new ConsoleDatabaseService();
  }

  /**
   * Create action instance from action type and config
   * @param actionType The type of action ('log', 'email', 'database')
   * @param actionConfig The action configuration
   * @returns HookAction instance
   * @throws Error if action type is unknown
   */
  createAction(actionType: string, actionConfig?: Record<string, unknown>): HookAction {
    switch (actionType) {
      case 'log':
        return this.createLogAction(actionConfig);
      case 'email':
        return this.createEmailAction(actionConfig);
      case 'database':
        return this.createDatabaseAction(actionConfig);
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  private createLogAction(config?: Record<string, unknown>): LogAction {
    if (!config) {
      return new LogAction();
    }

    const options: LogActionOptions = {
      prefix: this.extractString(config['prefix']),
      level: this.extractLogLevel(config['level']),
      destination: this.extractDestination(config['destination']),
      filePath: this.extractFilePath(config),
      includeMetadata: this.extractIncludeMetadata(config),
    };

    return new LogAction(options);
  }

  private createEmailAction(config?: Record<string, unknown>): EmailAction {
    if (!config) {
      throw new Error('Email action requires configuration');
    }

    const emailConfig = config as unknown as EmailActionConfig;
    return new EmailAction(emailConfig, this.emailService);
  }

  private createDatabaseAction(config?: Record<string, unknown>): DatabaseAction {
    if (!config) {
      throw new Error('Database action requires configuration');
    }

    const dbConfig = config as unknown as DatabaseActionConfig;
    return new DatabaseAction(dbConfig, this.databaseService);
  }

  private extractString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private extractLogLevel(value: unknown): LogLevelOption | undefined {
    return isValidLogLevel(value) ? value : undefined;
  }

  private extractDestination(value: unknown): LogDestinationOption | undefined {
    return isValidDestination(value) ? value : undefined;
  }

  private extractFilePath(config: Record<string, unknown>): string | undefined {
    if (typeof config['filePath'] === 'string') {
      return config['filePath'];
    }

    if (typeof config['file_path'] === 'string') {
      return config['file_path'];
    }

    return undefined;
  }

  private extractIncludeMetadata(config: Record<string, unknown>): boolean | undefined {
    if (typeof config['includeMetadata'] === 'boolean') {
      return config['includeMetadata'];
    }

    if (typeof config['include_metadata'] === 'boolean') {
      return config['include_metadata'];
    }

    return undefined;
  }
}

type LogLevelOption = 'info' | 'warn' | 'error' | 'debug';
type LogDestinationOption = 'console' | 'file';

function isValidLogLevel(value: unknown): value is LogLevelOption {
  return value === 'info' || value === 'warn' || value === 'error' || value === 'debug';
}

function isValidDestination(value: unknown): value is LogDestinationOption {
  return value === 'console' || value === 'file';
}

/**
 * Default action router instance
 * Uses console-based services for development
 */
export const defaultActionRouter = new ActionRouter();
