// ================================================================
// react/AuthProvider.tsx
// React context provider for authentication
// ================================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '../AuthService';
import type { User, RegisterResponse } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    surname: string;
  }) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
  authService: AuthService;
  loadingComponent?: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  authService,
  loadingComponent,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async (): Promise<void> => {
    setLoading(true);
    try {
      const { user: authUser } = await authService.getAuthState();
      setUser(authUser);
    } catch (error) {
      console.error('Auth state check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
      setInitialCheckDone(true);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const loggedInUser = await authService.login(email, password);
      setUser(loggedInUser);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    name: string;
    surname: string;
  }): Promise<RegisterResponse> => {
    setLoading(true);
    try {
      return await authService.register(userData);
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = async (): Promise<void> => {
    const { user: refreshedUser } = await authService.getAuthState();
    setUser(refreshedUser);
  };

  // Show loading screen during initial auth check
  if (!initialCheckDone) {
    return <>{loadingComponent || <div>Loading...</div>}</>;
  }

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: user !== null,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
