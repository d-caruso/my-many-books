import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Amplify } from 'aws-amplify';
import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession } from '@aws-amplify/auth';
import { User } from '../types';
import { env } from '../config/env';

// Configure Amplify (this should ideally be done in index.tsx or App.tsx)
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: env.COGNITO_USER_POOL_ID || '',
      userPoolClientId: env.COGNITO_USER_POOL_CLIENT_ID || '',
      identityPoolId: env.COGNITO_IDENTITY_POOL_ID || '', // Required but can be empty
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true,
        },
        given_name: {
          required: true,
        },
        family_name: {
          required: true,
        },
      },
      allowGuestAccess: false,
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
      },
    }
  }
});

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { email: string; password: string; name: string; surname: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      // Check if we're in development mode without Cognito config
      const isDevelopment = process.env.NODE_ENV === 'development' && 
                          !process.env.REACT_APP_COGNITO_USER_POOL_ID;
      
      if (isDevelopment) {
        // Create a mock user for local development
        const mockUser: User = {
          id: 1,
          email: 'demo@example.com',
          name: 'Demo',
          surname: 'User',
          isActive: true,
          creationDate: new Date().toISOString(),
          updateDate: new Date().toISOString()
        };
        
        setUser(mockUser);
        setToken('mock-dev-token');
        setLoading(false);
        return;
      }
      
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      
      if (currentUser && session.tokens?.accessToken) {
        const userData: User = {
          id: parseInt(currentUser.userId),
          email: currentUser.signInDetails?.loginId || '',
          name: currentUser.signInDetails?.loginId || '', // Will be updated when we get user attributes
          surname: '',
          isActive: true,
          creationDate: new Date().toISOString(),
          updateDate: new Date().toISOString()
        };

        setUser(userData);
        setToken(session.tokens.accessToken.toString());
      }
    } catch (error) {
      console.log('User not authenticated:', error);
      
      // In development without Cognito, create mock user after auth failure
      if (process.env.NODE_ENV === 'development') {
        const mockUser: User = {
          id: 1,
          email: 'demo@example.com',
          name: 'Demo',
          surname: 'User',
          isActive: true,
          creationDate: new Date().toISOString(),
          updateDate: new Date().toISOString()
        };
        
        setUser(mockUser);
        setToken('mock-dev-token');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const signInOutput = await signIn({
        username: email,
        password: password,
      });

      if (signInOutput.isSignedIn) {
        await checkAuthState();
      } else {
        throw new Error('Sign in incomplete');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: { email: string; password: string; name: string; surname: string }) => {
    try {
      setLoading(true);
      const signUpOutput = await signUp({
        username: userData.email,
        password: userData.password,
        options: {
          userAttributes: {
            email: userData.email,
            given_name: userData.name,
            family_name: userData.surname,
          },
        },
      });

      if (signUpOutput.isSignUpComplete) {
        // Auto sign in after successful registration
        await login(userData.email, userData.password);
      } else {
        // Handle confirmation required case
        throw new Error('Email confirmation required');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if logout fails
      setUser(null);
      setToken(null);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};