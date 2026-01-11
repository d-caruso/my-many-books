import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { appLifecycleService, SessionData } from '../services/lifecycle/AppLifecycleService';

export interface AppLifecycleState {
  appState: AppStateStatus;
  currentSession: SessionData | null;
  isMonitoring: boolean;
}

/**
 * Hook to manage app lifecycle monitoring and access current state
 */
export function useAppLifecycle(): AppLifecycleState {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);

  useEffect(() => {
    // Start lifecycle monitoring
    appLifecycleService.startMonitoring();
    setIsMonitoring(appLifecycleService.isMonitoring());

    // Set up local state tracking
    const updateLocalState = () => {
      setAppState(appLifecycleService.getCurrentAppState());
      setCurrentSession(appLifecycleService.getCurrentSession());
      setIsMonitoring(appLifecycleService.isMonitoring());
    };

    // Update state immediately
    updateLocalState();

    // Listen for app state changes to update local state
    const subscription = AppState.addEventListener('change', updateLocalState);

    // Update session state periodically
    const sessionInterval = setInterval(updateLocalState, 1000);

    return () => {
      subscription?.remove();
      clearInterval(sessionInterval);
      // Note: We don't stop the service here as other components might be using it
      // The service lifecycle is managed globally
    };
  }, []);

  return {
    appState,
    currentSession,
    isMonitoring,
  };
}