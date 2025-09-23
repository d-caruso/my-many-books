import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { User } from '../types';
import { env } from '../config/env';

// Check if Amplify should be configured
const isAmplifyConfigured = env.COGNITO_USER_POOL_ID && env.COGNITO_USER_POOL_CLIENT_ID;

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
      if (!isAmplifyConfigured) {
        console.log('Amplify not configured - skipping auth check');
        setLoading(false);
        return;
      }

      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      
      if (currentUser && session?.tokens?.accessToken) {
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
      // This is expected when user is not authenticated
      console.log('User not authenticated:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    if (!isAmplifyConfigured) {
      throw new Error('Authentication not configured');
    }

    try {
      setLoading(true);
      const signInOutput = await signIn({
        username: email,
        password: password,
      });

      console.log('Sign in output:', signInOutput);

      if (signInOutput.isSignedIn) {
        await checkAuthState();
      } else {
        // Handle different sign-in states
        const nextStep = signInOutput.nextStep;
        console.log('Next step required:', nextStep);
        
        switch (nextStep.signInStep) {
          case 'CONFIRM_SIGN_UP':
            throw new Error('Please verify your email address before signing in');
          case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
            throw new Error('New password required');
          case 'CONFIRM_SIGN_IN_WITH_SMS_MFA':
            throw new Error('SMS verification required');
          case 'CONFIRM_SIGN_IN_WITH_TOTP_MFA':
            throw new Error('TOTP verification required');
          case 'CONTINUE_SIGN_IN_WITH_MFA_SELECTION':
            throw new Error('MFA method selection required');
          default:
            throw new Error(`Sign in incomplete: ${nextStep.signInStep}`);
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: { email: string; password: string; name: string; surname: string }) => {
    if (!isAmplifyConfigured) {
      throw new Error('Authentication not configured');
    }

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

      console.log('Sign up output:', signUpOutput);

      if (signUpOutput.isSignUpComplete) {
        // Auto sign in after successful registration
        await login(userData.email, userData.password);
      } else {
        // Handle confirmation required case - this is expected for email verification
        const nextStep = signUpOutput.nextStep;
        console.log('Next step required:', nextStep);
        
        if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
          // Return success but indicate email verification is needed
          return {
            success: true,
            requiresVerification: true,
            message: 'Account created successfully! Please check your email and click the verification link to activate your account.',
            email: userData.email
          };
        } else {
          throw new Error(`Registration incomplete: ${nextStep.signUpStep}`);
        }
      }
      
      return {
        success: true,
        requiresVerification: false,
        message: 'Account created and verified successfully!'
      };
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