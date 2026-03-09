// ================================================================
// react/AuthProvider.tsx
// React context provider for authentication
// ================================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '../AuthService';
import type {
  User,
  RegisterResponse,
  ForgotPasswordResponse,
  ConfirmPasswordResetResponse,
} from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    surname: string;
    locale?: string;
  }) => Promise<RegisterResponse>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
    locale?: string;
  }) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<ForgotPasswordResponse>;
  confirmPasswordReset: (input: {
    email: string;
    code: string;
    newPassword: string;
    locale?: string;
  }) => Promise<ConfirmPasswordResetResponse>;
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
    let ignore = false;

    const checkAuth = async (): Promise<void> => {
      setLoading(true);
      try {
        const { user: authUser } = await authService.getAuthState();
        if (!ignore) setUser(authUser);
      } finally {
        if (!ignore) {
          setLoading(false);
          setInitialCheckDone(true);
        }
      }
    };

    checkAuth().catch(() => {
      if (!ignore) {
        setUser(null);
      }
    });
    return () => { ignore = true; };
  }, []);

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
    locale?: string;
  }): Promise<RegisterResponse> => {
    setLoading(true);
    try {
      return await authService.register(userData);
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (email: string, code: string): Promise<void> => {
    await authService.verifyEmail(email, code);
  };

  const resendCode = async (email: string): Promise<void> => {
    await authService.resendCode(email);
  };

  const changePassword = async (input: {
    currentPassword: string;
    newPassword: string;
    locale?: string;
  }): Promise<void> => {
    if (!user) {
      throw new Error('User is not authenticated');
    }

    setLoading(true);
    try {
      const updatedUser = await authService.changePassword({
        userId: user.id,
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        locale: input.locale,
      });
      setUser(updatedUser);
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async (email: string): Promise<ForgotPasswordResponse> => {
    setLoading(true);
    try {
      return await authService.requestPasswordReset(email);
    } finally {
      setLoading(false);
    }
  };

  const confirmPasswordReset = async (input: {
    email: string;
    code: string;
    newPassword: string;
    locale?: string;
  }): Promise<ConfirmPasswordResetResponse> => {
    setLoading(true);
    try {
      return await authService.confirmPasswordReset(input);
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    const cognitoLogoutUrl = await authService.logout();
    if (cognitoLogoutUrl && typeof window !== 'undefined') {
      window.location.href = cognitoLogoutUrl;
      return;
    }
    setUser(null);
  };

  const refreshUser = async (): Promise<void> => {
    const { user: refreshedUser } = await authService.getAuthState();
    if (!refreshedUser) throw new Error('Failed to restore session');
    setUser(refreshedUser);
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    register,
    verifyEmail,
    resendCode,
    changePassword,
    requestPasswordReset,
    confirmPasswordReset,
    logout,
    refreshUser,
    isAuthenticated: user !== null,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {initialCheckDone ? children : (loadingComponent || <div>Loading...</div>)}
    </AuthContext.Provider>
  );
};
