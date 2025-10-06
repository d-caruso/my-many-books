import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthPage } from '../../pages/AuthPage';
import { useAuth } from '../../contexts/AuthContext';

// Mock dependencies - industry standard approach
vi.mock('../../contexts/AuthContext');
vi.mock('../../components/Auth');
vi.mock('react-router-dom');

// Import mocked modules
import { LoginForm, RegisterForm } from '../../components/Auth';
import { Navigate } from 'react-router-dom';

describe('AuthPage', () => {
  beforeEach(() => {
    // Setup default mocks with proper Vitest mocked utility
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      updateUser: vi.fn(),
    });

    // Mock Auth components to simple test doubles
    vi.mocked(LoginForm).mockImplementation(({ onSwitchToRegister }: any) => (
      <div data-testid="login-form">
        Login Form
        <button data-testid="switch-to-register" onClick={onSwitchToRegister}>
          Switch to Register
        </button>
      </div>
    ));

    vi.mocked(RegisterForm).mockImplementation(({ onSwitchToLogin }: any) => (
      <div data-testid="register-form">
        Register Form
        <button data-testid="switch-to-login" onClick={onSwitchToLogin}>
          Switch to Login
        </button>
      </div>
    ));

    // Mock Navigate component
    vi.mocked(Navigate).mockImplementation(({ to, replace }: any) => (
      <div data-testid="navigate" data-to={to} data-replace={String(replace)}>
        Navigate to {to}
      </div>
    ));
  });

  test('renders login form by default', () => {
    render(<AuthPage />);
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.queryByTestId('register-form')).not.toBeInTheDocument();
  });

  test('switches to register form when switch button is clicked', () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByTestId('switch-to-register'));

    expect(screen.getByTestId('register-form')).toBeInTheDocument();
    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();
  });

  test('switches back to login form from register form', () => {
    render(<AuthPage />);

    // Switch to register
    fireEvent.click(screen.getByTestId('switch-to-register'));
    expect(screen.getByTestId('register-form')).toBeInTheDocument();

    // Switch back to login
    fireEvent.click(screen.getByTestId('switch-to-login'));
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.queryByTestId('register-form')).not.toBeInTheDocument();
  });

  test('redirects to home when user is authenticated', () => {
    // Override default mock for this specific test
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, name: 'Test User' } as any,
      token: 'mock-token',
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      updateUser: vi.fn(),
    });

    render(<AuthPage />);

    const navigate = screen.getByTestId('navigate');
    expect(navigate).toBeInTheDocument();
    expect(navigate).toHaveAttribute('data-to', '/');
    expect(navigate).toHaveAttribute('data-replace', 'true');
  });

  test('renders with correct container classes', () => {
    const { container } = render(<AuthPage />);
    const mainDiv = container.firstChild as HTMLElement;

    expect(mainDiv).toHaveClass(
      'min-h-screen',
      'bg-background',
      'flex',
      'items-center',
      'justify-center',
      'px-4',
      'py-12'
    );
  });

  test('renders with correct max-width wrapper', () => {
    render(<AuthPage />);
    const wrapper = screen.getByTestId('login-form').parentElement;

    expect(wrapper).toHaveClass('w-full', 'max-w-md');
  });
});
