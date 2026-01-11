import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';
import { appLifecycleService } from '../lifecycle/AppLifecycleService';
import { networkService } from '../network/NetworkService';
import { getErrorMessage } from '../../utils/helpers';

export interface ErrorContext {
  timestamp: number;
  errorId: string;
  userAgent?: string;
  appVersion?: string;
  sessionId?: string;
  userId?: string;
  appState?: string;
  networkState?: Record<string, unknown>;
  memoryUsage?: number;
  stackTrace?: string;
  userActions?: string[];
  additionalData?: Record<string, unknown>;
}

export interface ErrorEventData extends ErrorContext {
  errorType: string;
  message: string;
  source?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  originalError?: Error | Record<string, unknown>;
  recoveryAttempted?: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorTrackingService {
  private isTrackingActive = false;
  private errorHandlers: Array<() => void> = [];
  private userActionHistory: string[] = [];
  private readonly MAX_USER_ACTIONS = 10;
  private globalErrorHandler: ((error: unknown, isFatal: boolean) => void) | null = null;
  private promiseRejectionHandler: ((event: { reason?: unknown; preventDefault?: () => void }) => void) | null = null;

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
   * Setup global JavaScript error handling using React Native's ErrorUtils
   */
  private setupGlobalErrorHandling(): void {
    // Check if ErrorUtils is available (React Native environment)
    if (typeof global !== 'undefined' && global.ErrorUtils) {
      const originalErrorHandler = global.ErrorUtils.getGlobalHandler();

      this.globalErrorHandler = (error: unknown, isFatal: boolean) => {
        try {
          // Ensure we have a proper Error object
          const normalizedError = error instanceof Error 
            ? error 
            : new Error(getErrorMessage(error));

          // Track the error with proper context
          this.trackError(normalizedError, 'UNHANDLED', {
            severity: isFatal ? 'critical' : 'high',
            additionalData: { 
              isFatal,
              handlerType: 'global_error_utils',
              originalErrorType: typeof error,
              hasStack: Boolean(error?.stack)
            }
          });
        } catch (trackingError) {
          // Fallback: Log to console if tracking fails
          console.error('Error tracking failed:', trackingError);
          console.error('Original error:', error);
        }

        // Always call original handler to maintain app stability
        if (originalErrorHandler) {
          try {
            originalErrorHandler(error, isFatal);
          } catch (handlerError) {
            console.error('Original error handler failed:', handlerError);
          }
        }
      };

      // Set our custom error handler
      global.ErrorUtils.setGlobalHandler(this.globalErrorHandler);
      
      // Store cleanup function
      this.errorHandlers.push(() => {
        if (global.ErrorUtils) {
          global.ErrorUtils.setGlobalHandler(originalErrorHandler);
        }
      });
    } else {
      // Web/Jest environment fallback
      this.setupWebErrorHandling();
    }
  }

  /**
   * Setup error handling for web/Jest environments
   */
  private setupWebErrorHandling(): void {
    if (typeof window !== 'undefined' && window.addEventListener) {
      const errorHandler = (event: ErrorEvent) => {
        const error = new Error(event.message);
        error.stack = `${event.filename}:${event.lineno}:${event.colno}`;
        
        this.trackError(error, 'UNHANDLED', {
          severity: 'high',
          additionalData: {
            handlerType: 'window_error',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        });
      };

      window.addEventListener('error', errorHandler);
      
      this.errorHandlers.push(() => {
        window.removeEventListener('error', errorHandler);
      });
    }
  }

  /**
   * Setup unhandled promise rejection handling for multiple environments
   */
  private setupPromiseRejectionHandling(): void {
    const handlePromiseRejection = (event: { reason?: unknown; preventDefault?: () => void }) => {
      try {
        // Extract the rejection reason
        const reason = event.reason || event.detail?.reason || event;
        
        // Normalize to Error object
        const error = reason instanceof Error 
          ? reason 
          : new Error(reason?.message || String(reason) || 'Unhandled promise rejection');

        this.trackError(error, 'PROMISE_REJECTION', {
          severity: 'high',
          additionalData: {
            handlerType: 'promise_rejection',
            reasonType: typeof reason,
            hasPromise: Boolean(event.promise),
            eventType: event.type || 'unknown'
          }
        });
      } catch (trackingError) {
        console.error('Promise rejection tracking failed:', trackingError);
        console.error('Original rejection:', event);
      }
    };

    // React Native / Node.js environment
    if (typeof global !== 'undefined' && global.addEventListener) {
      global.addEventListener('unhandledrejection', handlePromiseRejection);
      this.errorHandlers.push(() => {
        if (global.removeEventListener) {
          global.removeEventListener('unhandledrejection', handlePromiseRejection);
        }
      });
    }
    
    // Web environment fallback
    else if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('unhandledrejection', handlePromiseRejection);
      this.errorHandlers.push(() => {
        window.removeEventListener('unhandledrejection', handlePromiseRejection);
      });
    }
    
    // Node.js process events (for testing environments)
    else if (typeof process !== 'undefined' && process.on) {
      const processHandler = (reason: unknown, promise: Promise<unknown>) => {
        handlePromiseRejection({ reason, promise: promise as unknown, type: 'process_unhandled_rejection' } as { reason?: unknown; preventDefault?: () => void });
      };
      
      process.on('unhandledRejection', processHandler);
      this.errorHandlers.push(() => {
        if (process.removeListener) {
          process.removeListener('unhandledRejection', processHandler);
        }
      });
    }
  }

  /**
   * Clean up error handlers
   */
  private cleanupErrorHandlers(): void {
    // Clean up all registered handlers
    this.errorHandlers.forEach(cleanup => {
      try {
        cleanup();
      } catch (cleanupError) {
        console.warn('Error handler cleanup failed:', cleanupError);
      }
    });
    
    this.errorHandlers = [];
    this.globalErrorHandler = null;
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
      if (__DEV__) {
        console.warn('Failed to collect network context:', getErrorMessage(error));
      }
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
      if (__DEV__) {
        console.warn('Failed to collect app context:', getErrorMessage(error));
      }
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
  private sanitizeError(error: Error): { name: string; message: string } {
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