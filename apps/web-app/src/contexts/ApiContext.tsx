/**
 * API Context Provider
 * Provides dependency injection for API service throughout the application
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { ApiService, createApiService } from '../services/api';

interface ApiContextValue {
  bookAPI: ApiService;
  categoryAPI: ApiService;
  authorAPI: ApiService;
  userAPI: ApiService;
  apiService: ApiService;
}

const ApiContext = createContext<ApiContextValue | undefined>(undefined);

interface ApiProviderProps {
  children: ReactNode;
  apiService?: ApiService;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children, apiService: injectedApiService }) => {
  // Use injected API service (for testing) or create default instance
  const apiService = injectedApiService || createApiService();

  const value: ApiContextValue = {
    bookAPI: apiService,
    categoryAPI: apiService,
    authorAPI: apiService,
    userAPI: apiService,
    apiService,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};

/**
 * Hook to access API service from any component
 * @throws Error if used outside ApiProvider
 */
export const useApi = (): ApiContextValue => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

// Export for testing
export { ApiContext };
