import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { useAuth } from '../../../components/../contexts/AuthContext';

// Mock the useAuth hook
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock react-router-dom Navigate component
vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to">{to}</div>,
  MemoryRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;

const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows loading spinner when loading is true', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  test('redirects to /auth when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/auth');
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  test('renders children when user is authenticated', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      provider: 'local',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument();
  });

  test('renders multiple children when authenticated', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      provider: 'local',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });

  test('loading state has correct styling', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </MemoryRouter>
    );

    // Check that the loading container is present
    const loadingContainer = screen.getByText('Loading...').closest('div');
    expect(loadingContainer).toBeInTheDocument();
  });
});