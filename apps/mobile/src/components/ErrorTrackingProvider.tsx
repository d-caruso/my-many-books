import { useEffect } from 'react';
import { errorTrackingService } from '../services/errors/ErrorTrackingService';

interface ErrorTrackingProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that initializes and manages error tracking
 */
export function ErrorTrackingProvider({ children }: ErrorTrackingProviderProps): React.JSX.Element {
  useEffect(() => {
    // Start error tracking when app initializes
    errorTrackingService.startTracking();

    // Record app initialization user action
    errorTrackingService.recordUserAction('app_initialized');

    return () => {
      // Stop error tracking when app unmounts
      errorTrackingService.stopTracking();
    };
  }, []);

  return <>{children}</>;
}