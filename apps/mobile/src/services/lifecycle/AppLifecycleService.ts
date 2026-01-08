import { AppState, AppStateStatus } from 'react-native';
import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';

export interface SessionData {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  appStateChanges: number;
  backgroundDuration: number;
}

export interface AppLifecycleEventData {
  timestamp: number;
  sessionId: string;
  appState: AppStateStatus;
  previousState?: AppStateStatus;
  sessionDuration?: number;
  memoryUsage?: number;
}

class AppLifecycleService {
  private isListening = false;
  private currentSession: SessionData | null = null;
  private currentAppState: AppStateStatus = 'unknown';
  private backgroundStartTime: number | null = null;
  private appStateChangeListener: any = null;
  private memoryWarningListener: any = null;

  /**
   * Start monitoring app lifecycle events
   */
  startMonitoring(): void {
    if (this.isListening) {
      return;
    }

    this.isListening = true;
    this.currentAppState = AppState.currentState;
    this.startSession();

    // Listen for app state changes
    this.appStateChangeListener = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );

    // Listen for memory warnings (if available)
    if (AppState.addEventListener) {
      try {
        // Note: Memory warnings are iOS-specific
        this.memoryWarningListener = AppState.addEventListener(
          'memoryWarning',
          this.handleMemoryWarning.bind(this)
        );
      } catch (error) {
        // Memory warning events might not be available on all platforms
      }
    }

    mobileHooks.emit(MOBILE_EVENTS.APP.STARTUP, {
      timestamp: Date.now(),
      sessionId: this.currentSession?.sessionId || '',
      appState: this.currentAppState,
      initialState: this.currentAppState
    });

    mobileHooks.emit(MOBILE_EVENTS.APP.INITIALIZATION.START, {
      timestamp: Date.now(),
      sessionId: this.currentSession?.sessionId || '',
      appState: this.currentAppState
    });
  }

  /**
   * Stop monitoring app lifecycle events
   */
  stopMonitoring(): void {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;

    // Remove listeners
    if (this.appStateChangeListener) {
      this.appStateChangeListener.remove();
      this.appStateChangeListener = null;
    }

    if (this.memoryWarningListener) {
      this.memoryWarningListener.remove();
      this.memoryWarningListener = null;
    }

    // End current session and capture it before clearing
    const finalSession = this.currentSession;
    this.endSession();

    mobileHooks.emit(MOBILE_EVENTS.APP.TERMINATION, {
      timestamp: Date.now(),
      sessionId: finalSession?.sessionId || '',
      appState: this.currentAppState,
      finalSession: finalSession
    });
  }

  /**
   * Mark app initialization as complete
   */
  markInitializationComplete(): void {
    if (!this.isListening) {
      return;
    }

    mobileHooks.emit(MOBILE_EVENTS.APP.INITIALIZATION.COMPLETE, {
      timestamp: Date.now(),
      sessionId: this.currentSession?.sessionId || '',
      appState: this.currentAppState,
      sessionDuration: this.getSessionDuration()
    });
  }

  /**
   * Get current session information
   */
  getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  /**
   * Check if lifecycle monitoring is active
   */
  isMonitoring(): boolean {
    return this.isListening;
  }

  /**
   * Get current app state
   */
  getCurrentAppState(): AppStateStatus {
    return this.currentAppState;
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.stopMonitoring();
    this.currentAppState = 'unknown';
    this.currentSession = null;
    this.backgroundStartTime = null;
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    const previousState = this.currentAppState;
    const timestamp = Date.now();

    // Update session data
    if (this.currentSession) {
      this.currentSession.appStateChanges++;

      // Track background duration
      if (previousState === 'background' && this.backgroundStartTime) {
        this.currentSession.backgroundDuration += timestamp - this.backgroundStartTime;
        this.backgroundStartTime = null;
      } else if (nextAppState === 'background') {
        this.backgroundStartTime = timestamp;
      }
    }

    const eventData: AppLifecycleEventData = {
      timestamp,
      sessionId: this.currentSession?.sessionId || '',
      appState: nextAppState,
      previousState,
      sessionDuration: this.getSessionDuration()
    };

    // Emit specific state change events
    if (nextAppState === 'active') {
      mobileHooks.emit(MOBILE_EVENTS.APP.ACTIVE, eventData);
      
      // If coming from background, also emit foreground
      if (previousState === 'background') {
        mobileHooks.emit(MOBILE_EVENTS.APP.FOREGROUND, {
          ...eventData,
          backgroundDuration: this.backgroundStartTime ? 
            timestamp - this.backgroundStartTime : 0
        });
      }
    } else if (nextAppState === 'inactive') {
      mobileHooks.emit(MOBILE_EVENTS.APP.INACTIVE, eventData);
    } else if (nextAppState === 'background') {
      mobileHooks.emit(MOBILE_EVENTS.APP.BACKGROUND, eventData);
    }

    this.currentAppState = nextAppState;
  }

  /**
   * Handle memory warnings
   */
  private handleMemoryWarning(): void {
    const eventData: AppLifecycleEventData = {
      timestamp: Date.now(),
      sessionId: this.currentSession?.sessionId || '',
      appState: this.currentAppState,
      sessionDuration: this.getSessionDuration(),
      memoryUsage: this.getMemoryUsage()
    };

    mobileHooks.emit(MOBILE_EVENTS.APP.MEMORY_WARNING, eventData);
  }

  /**
   * Start a new user session
   */
  private startSession(): void {
    const sessionId = this.generateSessionId();
    const startTime = Date.now();

    this.currentSession = {
      sessionId,
      startTime,
      appStateChanges: 0,
      backgroundDuration: 0
    };

    mobileHooks.emit(MOBILE_EVENTS.APP.SESSION.START, {
      timestamp: startTime,
      sessionId,
      appState: this.currentAppState
    });
  }

  /**
   * End the current user session
   */
  private endSession(): void {
    if (!this.currentSession) {
      return;
    }

    const endTime = Date.now();
    const duration = endTime - this.currentSession.startTime;

    this.currentSession.endTime = endTime;
    this.currentSession.duration = duration;

    mobileHooks.emit(MOBILE_EVENTS.APP.SESSION.END, {
      timestamp: endTime,
      sessionId: this.currentSession.sessionId,
      appState: this.currentAppState,
      sessionData: {
        ...this.currentSession,
        duration
      }
    });

    this.currentSession = null;
  }

  /**
   * Get current session duration
   */
  private getSessionDuration(): number {
    if (!this.currentSession) {
      return 0;
    }
    return Date.now() - this.currentSession.startTime;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get memory usage information (approximation)
   */
  private getMemoryUsage(): number {
    // Note: React Native doesn't provide direct memory usage APIs
    // This is a placeholder for potential future implementation
    // On iOS, this could be implemented with native modules
    return 0;
  }
}

// Export singleton instance
export const appLifecycleService = new AppLifecycleService();