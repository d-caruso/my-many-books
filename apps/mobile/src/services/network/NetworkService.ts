import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';
import { getErrorMessage } from '../../utils/helpers';

export interface NetworkEventData {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;
  timestamp: number;
  previousState?: {
    isOnline: boolean;
    isInternetReachable: boolean | null;
    connectionType: string;
  };
}

export class NetworkService {
  private currentState: NetInfoState | null = null;
  private isListening = false;
  private unsubscribe: (() => void) | null = null;
  private lastEventTime = 0;
  private readonly debounceMs: number;

  constructor(debounceMs: number = 500) {
    this.debounceMs = debounceMs;
  }

  /**
   * Start monitoring network state changes and emitting hookey events
   */
  async startMonitoring(): Promise<void> {
    if (this.isListening) {
      return;
    }

    try {
      // Get initial network state
      this.currentState = await NetInfo.fetch();
      this.isListening = true;

      // Emit initial network state
      this.emitNetworkEvent(this.currentState, null);

      // Subscribe to network state changes
      this.unsubscribe = NetInfo.addEventListener(this.handleNetworkStateChange.bind(this));

      mobileHooks.emit(MOBILE_EVENTS.NETWORK.MONITORING_START, {
        initialState: this.formatNetworkState(this.currentState),
        timestamp: Date.now()
      });

    } catch (error) {
      mobileHooks.emit(MOBILE_EVENTS.ERROR.NETWORK_TIMEOUT, {
        error: `Failed to initialize network monitoring: ${getErrorMessage(error)}`,
        timestamp: Date.now(),
        context: { service: 'NetworkService', method: 'startMonitoring' }
      });
    }
  }

  /**
   * Stop monitoring network state changes
   */
  stopMonitoring(): void {
    if (!this.isListening) {
      return;
    }

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.isListening = false;

    mobileHooks.emit(MOBILE_EVENTS.NETWORK.MONITORING_STOP, {
      lastState: this.currentState ? this.formatNetworkState(this.currentState) : null,
      timestamp: Date.now()
    });
  }

  /**
   * Get current network state
   */
  getCurrentState(): NetworkEventData | null {
    return this.currentState ? this.formatNetworkState(this.currentState) : null;
  }

  /**
   * Check if network monitoring is active
   */
  isMonitoring(): boolean {
    return this.isListening;
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.stopMonitoring();
    this.currentState = null;
    this.lastEventTime = 0;
  }


  /**
   * Handle network state changes with debouncing
   */
  private handleNetworkStateChange(state: NetInfoState): void {
    const now = Date.now();
    
    // Debounce rapid network state changes
    if (now - this.lastEventTime < this.debounceMs) {
      return;
    }

    const previousState = this.currentState;
    this.currentState = state;
    this.lastEventTime = now;

    this.emitNetworkEvent(state, previousState);
  }

  /**
   * Emit appropriate hookey events based on network state changes
   */
  private emitNetworkEvent(currentState: NetInfoState, previousState: NetInfoState | null): void {
    const eventData = this.formatNetworkState(currentState);

    // Add previous state if available
    if (previousState) {
      eventData.previousState = {
        isOnline: previousState.isConnected ?? false,
        isInternetReachable: previousState.isInternetReachable ?? null,
        connectionType: previousState.type
      };
    }

    // Emit connection state events
    if (currentState.isConnected !== previousState?.isConnected) {
      if (currentState.isConnected) {
        mobileHooks.emit(MOBILE_EVENTS.NETWORK.ONLINE, eventData);
        
        // Check if this is a restoration after being offline
        if (previousState && !previousState.isConnected) {
          mobileHooks.emit(MOBILE_EVENTS.NETWORK.RESTORED, {
            ...eventData,
            restoredFrom: eventData.previousState?.connectionType || 'unknown'
          });
        }
      } else {
        mobileHooks.emit(MOBILE_EVENTS.NETWORK.OFFLINE, eventData);
      }
    }

    // Emit connection type change events
    if (currentState.type !== previousState?.type && previousState !== null) {
      mobileHooks.emit(MOBILE_EVENTS.NETWORK.TYPE_CHANGED, {
        ...eventData,
        changedFrom: previousState.type,
        changedTo: currentState.type
      });
    }

    // Emit reachability events
    if (currentState.isInternetReachable !== previousState?.isInternetReachable) {
      if (currentState.isInternetReachable === true) {
        mobileHooks.emit(MOBILE_EVENTS.NETWORK.REACHABLE, eventData);
      } else if (currentState.isInternetReachable === false) {
        mobileHooks.emit(MOBILE_EVENTS.NETWORK.UNREACHABLE, eventData);
      }
    }

    // Emit quality change events (if connection quality information is available)
    if (this.hasQualityChanged(currentState, previousState)) {
      mobileHooks.emit(MOBILE_EVENTS.NETWORK.QUALITY_CHANGED, {
        ...eventData,
        qualityMetrics: this.extractQualityMetrics(currentState)
      });
    }
  }

  /**
   * Format NetInfoState into standardized NetworkEventData
   */
  private formatNetworkState(state: NetInfoState): NetworkEventData {
    return {
      isOnline: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? null,
      connectionType: state.type,
      timestamp: Date.now()
    };
  }

  /**
   * Check if network quality has changed significantly
   */
  private hasQualityChanged(current: NetInfoState, previous: NetInfoState | null): boolean {
    if (!previous) return false;

    // Check for cellular signal strength changes
    if (current.type === 'cellular' && previous.type === 'cellular') {
      const currentDetails = current.details as Record<string, unknown>;
      const previousDetails = previous.details as Record<string, unknown>;

      if (currentDetails?.strength !== previousDetails?.strength) {
        return true;
      }
    }

    // Check for wifi signal strength changes
    if (current.type === 'wifi' && previous.type === 'wifi') {
      const currentDetails = current.details as Record<string, unknown>;
      const previousDetails = previous.details as Record<string, unknown>;

      if (currentDetails?.strength !== previousDetails?.strength) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract quality metrics from NetInfoState
   */
  private extractQualityMetrics(state: NetInfoState): Record<string, unknown> {
    const details = state.details as Record<string, unknown>;
    const metrics: Record<string, unknown> = {
      connectionType: state.type
    };

    if (details) {
      if (details.strength !== undefined) {
        metrics.signalStrength = details.strength;
      }
      if (details.frequency !== undefined) {
        metrics.frequency = details.frequency;
      }
      if (details.linkSpeed !== undefined) {
        metrics.linkSpeed = details.linkSpeed;
      }
    }

    return metrics;
  }
}

// Export singleton instance
export const networkService = new NetworkService();