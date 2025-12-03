import { HookAction } from '../types';
import { LogAction } from './LogAction';
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
    const prefix = (config?.prefix as string) || 'hook';
    return new LogAction(prefix);
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
}

/**
 * Default action router instance
 * Uses console-based services for development
 */
export const defaultActionRouter = new ActionRouter();
