import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';
import { appLifecycleService } from '../lifecycle/AppLifecycleService';
import { networkService } from '../network/NetworkService';

export interface ErrorContext {
  timestamp: number;
  errorId: string;
  userAgent?: string;
  appVersion?: string;
  sessionId?: string;
  userId?: string;
  appState?: string;
  networkState?: any;
  memoryUsage?: number;
  stackTrace?: string;
  userActions?: string[];
  additionalData?: Record<string, any>;
}

export interface ErrorEventData extends ErrorContext {
  errorType: string;
  message: string;
  source?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  originalError?: any;
  recoveryAttempted?: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorTrackingService {
  private isTrackingActive = false;
  private errorHandlers: Array<() => void> = [];
  private userActionHistory: string[] = [];
  private readonly MAX_USER_ACTIONS = 10;
  private globalErrorHandler: any = null;
  private promiseRejectionHandler: any = null;

  /**
   * Start tracking errors and monitoring for unhandled exceptions
   */
  startTracking(): void {
    if (this.isTrackingActive) {
      return;
    }

    this.isTrackingActive = true;
    this.setupGlobalErrorHandling();
    this.setupPromiseRejectionHandling();
    
    mobileHooks.emit(MOBILE_EVENTS.ERROR.TRACKING_START, {
      timestamp: Date.now(),
      errorId: this.generateErrorId(),
      message: 'Error tracking service started'
    });
  }

  /**
   * Stop error tracking
   */
  stopTracking(): void {
    if (!this.isTrackingActive) {
      return;
    }

    this.isTrackingActive = false;
    this.cleanupErrorHandlers();

    mobileHooks.emit(MOBILE_EVENTS.ERROR.TRACKING_STOP, {
      timestamp: Date.now(),
      errorId: this.generateErrorId(),
      message: 'Error tracking service stopped'
    });
  }

  /**
   * Record a user action for context tracking
   */
  recordUserAction(action: string): void {
    if (!this.isTrackingActive) {
      return;
    }

    this.userActionHistory.unshift(`${Date.now()}: ${action}`);
    if (this.userActionHistory.length > this.MAX_USER_ACTIONS) {
      this.userActionHistory = this.userActionHistory.slice(0, this.MAX_USER_ACTIONS);
    }
  }

  /**
   * Track an error with full context
   */
  trackError(
    error: Error, 
    errorType: keyof typeof MOBILE_EVENTS.ERROR, 
    additionalContext: Partial<ErrorEventData> = {}
  ): void {
    if (!this.isTrackingActive) {
      return;
    }

    const errorData = this.buildErrorData(error, errorType, additionalContext);
    const eventType = MOBILE_EVENTS.ERROR[errorType];

    mobileHooks.emit(eventType, errorData);

    // Also emit a general error event for aggregation
    if (errorType !== 'UNHANDLED') {
      mobileHooks.emit(MOBILE_EVENTS.ERROR.UNHANDLED, {
        ...errorData,
        originalEventType: errorType
      });
    }
  }

  /**
   * Track user-facing errors (errors shown to users)
   */
  trackUserFacingError(
    userMessage: string, 
    originalError?: Error, 
    additionalContext: Partial<ErrorEventData> = {}
  ): void {
    if (!this.isTrackingActive) {
      return;
    }

    const errorData = this.buildErrorData(
      originalError || new Error(userMessage), 
      'USER_FACING', 
      {
        ...additionalContext,
        message: userMessage,
        severity: additionalContext.severity || 'medium'
      }
    );

    mobileHooks.emit(MOBILE_EVENTS.ERROR.USER_FACING, errorData);
  }

  /**
   * Track error recovery attempts
   */
  trackErrorRecovery(
    originalError: Error, 
    recoveryAction: string, 
    success: boolean,
    additionalContext: Partial<ErrorEventData> = {}
  ): void {
    if (!this.isTrackingActive) {
      return;
    }

    const errorData = this.buildErrorData(originalError, 'RECOVERED', {
      ...additionalContext,
      recoveryAttempted: true,
      additionalData: {
        recoveryAction,
        recoverySuccess: success,
        ...additionalContext.additionalData
      }
    });

    mobileHooks.emit(MOBILE_EVENTS.ERROR.RECOVERED, errorData);
  }

  /**
   * Check if error tracking is active
   */
  isTracking(): boolean {
    return this.isTrackingActive;
  }

  /**
   * Get recent user actions for debugging
   */
  getUserActionHistory(): string[] {
    return [...this.userActionHistory];
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.stopTracking();
    this.userActionHistory = [];
  }

  /**
   * Setup global JavaScript error handling
   */
  private setupGlobalErrorHandling(): void {
    const originalErrorHandler = global.ErrorUtils?.getGlobalHandler();

    this.globalErrorHandler = (error: any, isFatal: boolean) => {
      // Track the error
      this.trackError(
        error instanceof Error ? error : new Error(String(error)),
        'UNHANDLED',
        {
          severity: isFatal ? 'critical' : 'high',
          additionalData: { 
            isFatal,
            handlerType: 'global'
          }
        }
      );

      // Call original handler if it exists
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    };

    // Set our custom error handler
    global.ErrorUtils?.setGlobalHandler(this.globalErrorHandler);
  }

  /**
   * Setup unhandled promise rejection handling
   */
  private setupPromiseRejectionHandling(): void {
    const handlePromiseRejection = (event: any) => {
      const reason = event.reason || event;
      const error = reason instanceof Error ? reason : new Error(String(reason));

      this.trackError(error, 'PROMISE_REJECTION', {
        severity: 'high',
        additionalData: {
          handlerType: 'promise_rejection',
          reason: String(reason)
        }
      });
    };

    // Add promise rejection listener
    if (global.addEventListener) {
      global.addEventListener('unhandledrejection', handlePromiseRejection);
      this.promiseRejectionHandler = () => {
        global.removeEventListener('unhandledrejection', handlePromiseRejection);
      };
    }
  }

  /**
   * Clean up error handlers
   */
  private cleanupErrorHandlers(): void {
    // Restore original global error handler
    if (this.globalErrorHandler) {
      global.ErrorUtils?.setGlobalHandler(null);
      this.globalErrorHandler = null;
    }

    // Remove promise rejection handler
    if (this.promiseRejectionHandler) {
      this.promiseRejectionHandler();
      this.promiseRejectionHandler = null;
    }

    // Clean up any other handlers
    this.errorHandlers.forEach(cleanup => cleanup());
    this.errorHandlers = [];
  }

  /**
   * Build comprehensive error data with context
   */
  private buildErrorData(
    error: Error, 
    errorType: keyof typeof MOBILE_EVENTS.ERROR,
    additionalContext: Partial<ErrorEventData> = {}
  ): ErrorEventData {
    const errorId = this.generateErrorId();
    const timestamp = Date.now();

    // Gather context from other services
    const appLifecycleContext = this.getAppLifecycleContext();
    const networkContext = this.getNetworkContext();

    return {
      timestamp,
      errorId,
      errorType,
      message: additionalContext.message || error.message || 'Unknown error',
      source: additionalContext.source || 'mobile_app',
      filename: additionalContext.filename || error.stack?.split('\n')[1]?.match(/\((.+?):\d+:\d+\)/)?.[1],
      stackTrace: this.sanitizeStackTrace(error.stack),
      severity: additionalContext.severity || 'medium',
      userActions: [...this.userActionHistory],
      ...appLifecycleContext,
      ...networkContext,
      ...additionalContext,
      originalError: this.sanitizeError(error),
    };
  }

  /**
   * Get app lifecycle context
   */
  private getAppLifecycleContext(): Partial<ErrorContext> {
    try {
      const session = appLifecycleService.getCurrentSession();
      const appState = appLifecycleService.getCurrentAppState();

      return {
        sessionId: session?.sessionId,
        appState: appState,
        additionalData: {
          sessionDuration: session ? Date.now() - session.startTime : 0,
          appStateChanges: session?.appStateChanges || 0,
        }
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Get network context
   */
  private getNetworkContext(): Partial<ErrorContext> {
    try {
      const networkState = networkService.getCurrentState();
      
      return {
        networkState: networkState ? {
          isOnline: networkState.isOnline,
          connectionType: networkState.connectionType,
          isInternetReachable: networkState.isInternetReachable
        } : null
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize stack trace to remove sensitive information
   */
  private sanitizeStackTrace(stack?: string): string {
    if (!stack) return '';

    // Remove potential file paths that might contain sensitive info
    return stack
      .split('\n')
      .map(line => {
        // Remove full file paths, keep only filename
        return line.replace(/\/.*\//g, '');
      })
      .join('\n');
  }

  /**
   * Sanitize error object to remove sensitive data
   */
  private sanitizeError(error: Error): any {
    return {
      name: error.name,
      message: error.message,
      // Don't include the full error object to avoid circular references
      // and potential sensitive data
    };
  }
}

// Export singleton instance
export const errorTrackingService = new ErrorTrackingService();