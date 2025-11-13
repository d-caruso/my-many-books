import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { env } from '../config/env';
import { apiService } from '../services/api';
import { useApi } from '../contexts/ApiContext';
import { configureAmplify } from '../config/amplify';

// Dynamic import types for AWS Amplify to defer loading
type SignInOutput = any;
type SignUpOutput = any;

// Check if Amplify should be configured
const shouldConfigureAmplify = env.COGNITO_USER_POOL_ID && env.COGNITO_USER_POOL_CLIENT_ID;

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
  const [amplifyConfigured, setAmplifyConfigured] = useState(false);
  const { userAPI } = useApi(); // Get userAPI from context

  useEffect(() => {
    // Fast path: Check localStorage first for returning users
    const cachedToken = localStorage.getItem('authToken');
    const cachedUserData = localStorage.getItem('user_profile');

    if (cachedToken && cachedUserData) {
      try {
        // Restore user from cache immediately
        const parsedUser = JSON.parse(cachedUserData);
        setUser(parsedUser);
        setToken(cachedToken);
        setLoading(false); // Show app immediately for returning users

        // Verify authentication in background
        const verifyAuth = async () => {
          if (shouldConfigureAmplify) {
            const configured = await configureAmplify();
            setAmplifyConfigured(configured);
            if (configured) {
              // Verify session is still valid
              const { getCurrentUser, fetchAuthSession } = await import('aws-amplify/auth');
              try {
                await getCurrentUser();
                const session = await fetchAuthSession();
                if (session?.tokens?.idToken) {
                  const idToken = session.tokens.idToken.toString();
                  localStorage.setItem('authToken', idToken);
                  setToken(idToken);

                  // Refresh user profile in background
                  userAPI.getCurrentUser()
                    .then(backendUser => {
                      const userData: User = {
                        id: backendUser.id,
                        email: backendUser.email,
                        name: backendUser.name,
                        surname: backendUser.surname,
                        isActive: backendUser.isActive,
                        role: backendUser.role,
                        creationDate: backendUser.creationDate,
                        updateDate: backendUser.updateDate
                      };
                      setUser(userData);
                      localStorage.setItem('user_profile', JSON.stringify(userData));
                    })
                    .catch(error => console.error('Failed to refresh user profile:', error));
                } else {
                  // Session invalid, clear and redirect
                  setUser(null);
                  setToken(null);
                  localStorage.removeItem('authToken');
                  localStorage.removeItem('user_profile');
                }
              } catch (error) {
                // Auth check failed, clear cache
                setUser(null);
                setToken(null);
                localStorage.removeItem('authToken');
                localStorage.removeItem('user_profile');
              }
            }
          }
        };

        verifyAuth();
        return;
      } catch (e) {
        // Cache is corrupted, fall through to full auth check
        console.error('Failed to parse cached user data:', e);
        localStorage.removeItem('user_profile');
        localStorage.removeItem('authToken');
      }
    }

    // No cache or corrupted cache - full auth check (first time users)
    const initializeAuth = async () => {
      if (shouldConfigureAmplify) {
        const configured = await configureAmplify();
        setAmplifyConfigured(configured);
        if (configured) {
          checkAuthState(configured);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const checkAuthState = async (isConfigured: boolean = amplifyConfigured) => {
    try {
      if (!isConfigured) {
        setLoading(false);
        return;
      }

      // Dynamically import AWS Amplify auth functions
      const { getCurrentUser, fetchAuthSession } = await import('aws-amplify/auth');

      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();

      if (currentUser && session?.tokens?.idToken) {
        const idToken = session.tokens.idToken.toString();
        // Store token in localStorage for API client
        localStorage.setItem('authToken', idToken);

        // Try to load cached user data for instant render
        const cachedUserData = localStorage.getItem('user_profile');
        if (cachedUserData) {
          try {
            const parsedUser = JSON.parse(cachedUserData);
            setUser(parsedUser);
            setToken(idToken);
            setLoading(false); // Stop loading immediately with cached data

            // Fetch full user profile from backend in background (non-blocking)
            // This updates the UI if role or other data changed
            userAPI.getCurrentUser()
              .then(backendUser => {
                const userData: User = {
                  id: backendUser.id,
                  email: backendUser.email,
                  name: backendUser.name,
                  surname: backendUser.surname,
                  isActive: backendUser.isActive,
                  role: backendUser.role,
                  creationDate: backendUser.creationDate,
                  updateDate: backendUser.updateDate
                };

                setUser(userData);
                // Update cache
                localStorage.setItem('user_profile', JSON.stringify(userData));
              })
              .catch(error => {
                console.error('Failed to refresh user profile:', error);
                // Keep using cached data
              });
          } catch (e) {
            console.error('Failed to parse cached user data:', e);
            // Cache is corrupted, fall through to fetch from backend
            localStorage.removeItem('user_profile');
          }
        }

        // No cache - fetch from backend in background (non-blocking)
        if (!cachedUserData) {
          // Create temporary user object from Cognito data
          const tempUser: User = {
            id: 0, // Will be updated when backend responds
            email: currentUser.signInDetails?.loginId || currentUser.username || '',
            name: '',
            surname: '',
            isActive: true,
            role: 'user', // Assume user role initially
            creationDate: new Date().toISOString(),
            updateDate: new Date().toISOString()
          };

          setUser(tempUser);
          setToken(idToken);
          setLoading(false); // Don't block rendering

          // Fetch full user profile in background (non-blocking)
          userAPI.getCurrentUser()
            .then(backendUser => {
              const userData: User = {
                id: backendUser.id,
                email: backendUser.email,
                name: backendUser.name,
                surname: backendUser.surname,
                isActive: backendUser.isActive,
                role: backendUser.role,
                creationDate: backendUser.creationDate,
                updateDate: backendUser.updateDate
              };

              setUser(userData);
              // Cache user data for next time
              localStorage.setItem('user_profile', JSON.stringify(userData));
            })
            .catch(error => {
              console.error('Failed to fetch user profile:', error);
              // Keep using temp user data
            });
        }
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user_profile');
        setLoading(false);
      }
    } catch (error) {
      setUser(null);
      setToken(null);
      localStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // Ensure Amplify is configured before attempting login
    if (!amplifyConfigured) {
      if (shouldConfigureAmplify) {
        const configured = await configureAmplify();
        setAmplifyConfigured(configured);
        if (!configured) {
          throw new Error('Authentication not configured');
        }
      } else {
        throw new Error('Authentication not configured');
      }
    }

    try {
      setLoading(true);

      // Dynamically import AWS Amplify auth functions
      const { signIn, fetchAuthSession } = await import('aws-amplify/auth');

      const signInOutput = await signIn({
        username: email,
        password: password,
      });

      if (signInOutput.isSignedIn) {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();
        if (idToken) {
          localStorage.setItem('authToken', idToken);
        }
        await checkAuthState();
      } else {
        // Handle different sign-in states
        const nextStep = signInOutput.nextStep;
        
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
    // Ensure Amplify is configured before attempting registration
    if (!amplifyConfigured) {
      if (shouldConfigureAmplify) {
        const configured = await configureAmplify();
        setAmplifyConfigured(configured);
        if (!configured) {
          throw new Error('Authentication not configured');
        }
      } else {
        throw new Error('Authentication not configured');
      }
    }

    try {
      setLoading(true);

      // Dynamically import AWS Amplify auth functions
      const { signUp } = await import('aws-amplify/auth');

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
        // Handle confirmation required case - this is expected for email verification
        const nextStep = signUpOutput.nextStep;
        
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
      // Dynamically import AWS Amplify auth functions
      const { signOut } = await import('aws-amplify/auth');

      await signOut();
      setUser(null);
      setToken(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user_profile');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if logout fails
      setUser(null);
      setToken(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user_profile');
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      // Update cache
      localStorage.setItem('user_profile', JSON.stringify(updatedUser));
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