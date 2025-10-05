import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthPage } from '../../pages/AuthPage';

// Mock the auth context and components
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../components/Auth', () => ({
  LoginForm: ({ onSwitchToRegister }: any) => (
    <div data-testid="login-form">
      Login Form
      <button data-testid="switch-to-register" onClick={onSwitchToRegister}>
        Switch to Register
      </button>
    </div>
  ),
  RegisterForm: ({ onSwitchToLogin }: any) => (
    <div data-testid="register-form">
      Register Form
      <button data-testid="switch-to-login" onClick={onSwitchToLogin}>
        Switch to Login
      </button>
    </div>
  ),
}));

vi.mock('react-router-dom', () => ({
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
    <div data-testid="navigate" data-to={to} data-replace={replace}>
      Navigate to {to}
    </div>
  ),
}));

const { useAuth } = require('../../contexts/AuthContext');

describe('AuthPage', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: null });
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
    useAuth.mockReturnValue({ user: { id: 1, name: 'Test User' } });
    
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