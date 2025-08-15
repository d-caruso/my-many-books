import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test component to access the auth context
const TestComponent: React.FC = () => {
  const { user, loading, login, logout, signup } = useAuth();

  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="loading">{loading ? 'true' : 'false'}</div>
      <button onClick={() => login('test@example.com', 'password')} data-testid="login">
        Login
      </button>
      <button onClick={logout} data-testid="logout">
        Logout
      </button>
      <button onClick={() => signup('test@example.com', 'password', 'Test User')} data-testid="signup">
        Signup
      </button>
    </div>
  );
};

// Mock fetch globally
global.fetch = jest.fn();

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  test('provides auth context to children', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.getByTestId('logout')).toBeInTheDocument();
    expect(screen.getByTestId('signup')).toBeInTheDocument();
  });

  test('throws error when useAuth is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  test('loads user from localStorage on mount', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      provider: 'local',
    };
    
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
  });

  test('handles invalid JSON in localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-json');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  test('login function makes API call and updates state', async () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      provider: 'local',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser, token: 'mock-token' }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('login'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');
  });

  test('login handles API errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('login'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  test('logout clears user state and localStorage', async () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      provider: 'local',
    };
    
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockUser));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // User should be loaded from localStorage
    expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));

    fireEvent.click(screen.getByTestId('logout'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
  });

  test('signup function makes API call', async () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      provider: 'local',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser, token: 'mock-token' }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('signup'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/signup'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password',
            name: 'Test User',
          }),
        })
      );
    });
  });

  test('loading state is managed correctly during async operations', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (global.fetch as jest.Mock).mockReturnValueOnce(promise);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('login'));

    // Should show loading state
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({ user: { userId: 1, email: 'test@example.com' }, token: 'token' }),
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
  });
});