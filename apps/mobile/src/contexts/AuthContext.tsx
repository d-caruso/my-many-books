import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';
import { userAPI } from '@/services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        // Set the token in the API client
        userAPI.setAuthToken(token);
        
        // Verify the token and get user info
        const userData = await userAPI.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
      await AsyncStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await userAPI.login({ email, password });
      
      // Store token
      await AsyncStorage.setItem('authToken', response.token);
      
      // Set token in API client
      userAPI.setAuthToken(response.token);
      
      setUser(response.user);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      const response = await userAPI.register({ email, password, name });
      
      // Store token
      await AsyncStorage.setItem('authToken', response.token);
      
      // Set token in API client
      userAPI.setAuthToken(response.token);
      
      setUser(response.user);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      userAPI.clearAuthToken();
      setUser(null);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await userAPI.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};