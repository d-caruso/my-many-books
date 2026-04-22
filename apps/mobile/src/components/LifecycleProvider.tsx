import { useEffect } from 'react';
import { appLifecycleService } from '../services/lifecycle/AppLifecycleService';

interface LifecycleProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that initializes and manages app lifecycle monitoring
 */
export function LifecycleProvider({ children }: LifecycleProviderProps): React.JSX.Element {
  useEffect(() => {
    // Start lifecycle monitoring when app initializes
    appLifecycleService.startMonitoring();

    // Mark initialization as complete after initial render
    const timer = setTimeout(() => {
      appLifecycleService.markInitializationComplete();
    }, 100); // Small delay to ensure app is fully initialized

    return () => {
      clearTimeout(timer);
      // Stop lifecycle monitoring when app unmounts
      appLifecycleService.stopMonitoring();
    };
  }, []);

  return <>{children}</>;
}