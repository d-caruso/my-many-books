import React, { createContext, useContext, ReactNode } from 'react';
import { usePWA } from '../hooks/usePWA';

interface PWAState {
  isOffline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  updateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

interface PWAActions {
  installApp: () => Promise<void>;
  updateApp: () => Promise<void>;
  dismissUpdate: () => void;
}

type PWAContextType = PWAState & PWAActions;

const PWAContext = createContext<PWAContextType | undefined>(undefined);

interface PWAProviderProps {
  children: ReactNode;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const pwa = usePWA();

  return <PWAContext.Provider value={pwa}>{children}</PWAContext.Provider>;
};

export const usePWAContext = (): PWAContextType => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWAContext must be used within a PWAProvider');
  }
  return context;
};
