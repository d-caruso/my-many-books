import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { ApiProvider } from '../../contexts/ApiContext';

// Mock AWS Amplify auth - industry standard approach
vi.mock('aws-amplify/auth');
import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

// Mock API service
const mockApiService = {
  getCurrentUser: vi.fn(),
  updateProfile: vi.fn(),
  getBooks: vi.fn(),
  getBook: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
  deleteBook: vi.fn(),
  searchBooks: vi.fn(),
  searchByISBN: vi.fn(),
  getCategories: vi.fn(),
  getCategory: vi.fn(),
  createCategory: vi.fn(),
  getAuthors: vi.fn(),
  getAuthor: vi.fn(),
  createAuthor: vi.fn(),
  searchAuthors: vi.fn(),
} as any;

// Test component to access the auth context
const TestComponent: React.FC = () => {
  const { user, loading, login, logout, register } = useAuth();

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
      <button
        onClick={() =>
          register({
            email: 'test@example.com',
            password: 'password',
            name: 'Test',
            surname: 'User',
          })
        }
        data-testid="signup"
      >
        Signup
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'));
    vi.mocked(fetchAuthSession).mockResolvedValue({ tokens: undefined } as any);
    vi.mocked(signIn).mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } } as any);
    vi.mocked(signUp).mockResolvedValue({
      isSignUpComplete: true,
      userId: 'test-user-id',
      nextStep: { signUpStep: 'DONE' },
    } as any);
    vi.mocked(signOut).mockResolvedValue();

    // Mock localStorage
    Storage.prototype.getItem = vi.fn(() => null);
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
  });

  test('provides auth context to children', () => {
    render(
      <ApiProvider apiService={mockApiService}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </ApiProvider>
    );

    expect(screen.getByTestId('user')).toBeInTheDocument();
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.getByTestId('logout')).toBeInTheDocument();
    expect(screen.getByTestId('signup')).toBeInTheDocument();
  });

  test('throws error when useAuth is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  test('loads user from AWS Amplify on mount', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'test@example.com',
      surname: '',
      isActive: true,
      creationDate: new Date().toISOString(),
      updateDate: new Date().toISOString(),
    };

    // Mock successful authentication on mount
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: '1',
      username: 'test@example.com',
      signInDetails: {
        loginId: 'test@example.com',
      },
    } as any);

    vi.mocked(fetchAuthSession).mockResolvedValue({
      tokens: {
        idToken: { toString: () => 'mock-token' },
      },
    } as any);

    // Mock API service getCurrentUser
    mockApiService.getCurrentUser.mockResolvedValue(mockUser);

    render(
      <ApiProvider apiService={mockApiService}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </ApiProvider>
    );

    // User should be loaded from AWS Amplify after mount
    await waitFor(() => {
      const userElement = screen.getByTestId('user');
      const userData = JSON.parse(userElement.textContent || '{}');
      expect(userData.id).toBe(1);
      expect(userData.email).toBe('test@example.com');
    }, { timeout: 3000 });
  });

  test('handles invalid JSON in localStorage', () => {
    vi.mocked(Storage.prototype.getItem).mockReturnValue('invalid-json');

    render(
      <ApiProvider apiService={mockApiService}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </ApiProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  test('login function calls AWS Amplify signIn', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test',
      surname: 'User',
    };

    // Mock successful authentication
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: 'test-user-id',
      username: 'test@example.com',
    } as any);

    vi.mocked(fetchAuthSession).mockResolvedValue({
      tokens: {
        idToken: { toString: () => 'mock-token' },
      },
    } as any);

    // Mock fetch for user data
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: mockUser, token: 'mock-token' }),
    } as any);

    render(
      <ApiProvider apiService={mockApiService}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </ApiProvider>
    );

    fireEvent.click(screen.getByTestId('login'));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'password',
      });
    });
  });

  test('logout clears user state and calls AWS Amplify signOut', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'test@example.com',
      surname: '',
      isActive: true,
      creationDate: new Date().toISOString(),
      updateDate: new Date().toISOString(),
    };

    // Mock successful authentication on mount
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: '1',
      username: 'test@example.com',
      signInDetails: {
        loginId: 'test@example.com',
      },
    } as any);

    vi.mocked(fetchAuthSession).mockResolvedValue({
      tokens: {
        idToken: { toString: () => 'mock-token' },
      },
    } as any);

    // Mock API service getCurrentUser
    mockApiService.getCurrentUser.mockResolvedValue(mockUser);

    render(
      <ApiProvider apiService={mockApiService}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </ApiProvider>
    );

    // Wait for user to be loaded from AWS Amplify
    await waitFor(() => {
      const userElement = screen.getByTestId('user');
      expect(userElement.textContent).not.toBe('null');
    }, { timeout: 3000 });

    fireEvent.click(screen.getByTestId('logout'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });
  });

  test('signup function calls AWS Amplify signUp', async () => {
    render(
      <ApiProvider apiService={mockApiService}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </ApiProvider>
    );

    fireEvent.click(screen.getByTestId('signup'));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'password',
        options: {
          userAttributes: {
            email: 'test@example.com',
            given_name: 'Test',
            family_name: 'User',
          },
        },
      });
    });
  });

  test('loading state is managed correctly during async operations', async () => {
    render(
      <ApiProvider apiService={mockApiService}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </ApiProvider>
    );

    // Initial loading should be false after mount
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
  });
});
