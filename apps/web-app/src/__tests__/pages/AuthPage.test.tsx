import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthPage } from '../../pages/AuthPage';
import { useAuth } from '../../pages/../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock React Router Navigate component
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
    <div data-testid="navigate" data-to={to} data-replace={replace?.toString()}>
      Redirecting to {to}
    </div>
  ),
}));

// Mock Auth components
jest.mock('../../components/Auth', () => ({
  LoginForm: ({ onSwitchToRegister }: { onSwitchToRegister: () => void }) => (
    <div data-testid="login-form">
      Login Form
      <button onClick={onSwitchToRegister} data-testid="switch-to-register">
        Switch to Register
      </button>
    </div>
  ),
  RegisterForm: ({ onSwitchToLogin }: { onSwitchToLogin: () => void }) => (
    <div data-testid="register-form">
      Register Form
      <button onClick={onSwitchToLogin} data-testid="switch-to-login">
        Switch to Login
      </button>
    </div>
  ),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Wrapper component to provide Router context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('AuthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form by default when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
    });

    render(<AuthPage />, { wrapper: TestWrapper });

    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.getByText('Login Form')).toBeInTheDocument();
    expect(screen.queryByTestId('register-form')).not.toBeInTheDocument();
  });

  test('switches to register form when switch button is clicked', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
    });

    render(<AuthPage />, { wrapper: TestWrapper });

    // Initially shows login form
    expect(screen.getByTestId('login-form')).toBeInTheDocument();

    // Click switch to register button
    fireEvent.click(screen.getByTestId('switch-to-register'));

    // Should now show register form
    expect(screen.getByTestId('register-form')).toBeInTheDocument();
    expect(screen.getByText('Register Form')).toBeInTheDocument();
    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();
  });

  test('switches back to login form from register form', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
    });

    render(<AuthPage />, { wrapper: TestWrapper });

    // Switch to register form first
    fireEvent.click(screen.getByTestId('switch-to-register'));
    expect(screen.getByTestId('register-form')).toBeInTheDocument();

    // Switch back to login form
    fireEvent.click(screen.getByTestId('switch-to-login'));
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.queryByTestId('register-form')).not.toBeInTheDocument();
  });

  test('redirects to home when user is authenticated', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      provider: 'local',
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
    });

    render(<AuthPage />, { wrapper: TestWrapper });

    const navigateElement = screen.getByTestId('navigate');
    expect(navigateElement).toBeInTheDocument();
    expect(navigateElement).toHaveAttribute('data-to', '/');
    expect(navigateElement).toHaveAttribute('data-replace', 'true');
    expect(screen.getByText('Redirecting to /')).toBeInTheDocument();

    // Should not render auth forms
    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('register-form')).not.toBeInTheDocument();
  });

  test('has correct layout and styling classes', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
    });

    const { container } = render(<AuthPage />, { wrapper: TestWrapper });

    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toHaveClass(
      'min-h-screen',
      'bg-background',
      'flex',
      'items-center',
      'justify-center',
      'px-4',
      'py-12'
    );

    const formContainer = container.querySelector('.w-full.max-w-md');
    expect(formContainer).toBeInTheDocument();
  });

  test('maintains state during form switches', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
    });

    render(<AuthPage />, { wrapper: TestWrapper });

    // Start with login form
    expect(screen.getByTestId('login-form')).toBeInTheDocument();

    // Switch to register and back multiple times
    fireEvent.click(screen.getByTestId('switch-to-register'));
    expect(screen.getByTestId('register-form')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('switch-to-login'));
    expect(screen.getByTestId('login-form')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('switch-to-register'));
    expect(screen.getByTestId('register-form')).toBeInTheDocument();
  });

  test('handles auth context loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
    });

    render(<AuthPage />, { wrapper: TestWrapper });

    // Should still render the form even during loading
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });

  test('passes correct props to LoginForm', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
    });

    render(<AuthPage />, { wrapper: TestWrapper });

    // LoginForm should receive onSwitchToRegister prop
    const switchButton = screen.getByTestId('switch-to-register');
    expect(switchButton).toBeInTheDocument();

    // Function should work correctly
    fireEvent.click(switchButton);
    expect(screen.getByTestId('register-form')).toBeInTheDocument();
  });

  test('passes correct props to RegisterForm', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
    });

    render(<AuthPage />, { wrapper: TestWrapper });

    // Switch to register form first
    fireEvent.click(screen.getByTestId('switch-to-register'));

    // RegisterForm should receive onSwitchToLogin prop
    const switchButton = screen.getByTestId('switch-to-login');
    expect(switchButton).toBeInTheDocument();

    // Function should work correctly
    fireEvent.click(switchButton);
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });
});