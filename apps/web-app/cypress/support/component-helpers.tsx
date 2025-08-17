import React, { createContext, useContext, ReactNode } from 'react';

// Mock AuthContext for testing
interface MockAuthContextType {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { email: string; password: string; name: string; surname: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: any) => void;
  user: any;
  token: string | null;
  loading: boolean;
}

const MockAuthContext = createContext<MockAuthContextType>({
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUser: () => {},
  user: null,
  token: null,
  loading: false,
});

export const useAuth = () => useContext(MockAuthContext);

// Create a MockAuthProvider that matches the real AuthProvider interface
export const MockAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const mockContextValue: MockAuthContextType = {
    login: async (email: string, password: string) => {
      console.log('Mock login:', email, password);
    },
    register: async (userData: { email: string; password: string; name: string; surname: string }) => {
      console.log('Mock register:', userData);
    },
    logout: async () => {
      console.log('Mock logout');
    },
    updateUser: (userData: any) => {
      console.log('Mock updateUser:', userData);
    },
    user: null,
    token: null,
    loading: false,
  };

  return (
    <MockAuthContext.Provider value={mockContextValue}>
      {children}
    </MockAuthContext.Provider>
  );
};

export const TestWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <MockAuthProvider>
      <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </div>
    </MockAuthProvider>
  );
};

export default TestWrapper;