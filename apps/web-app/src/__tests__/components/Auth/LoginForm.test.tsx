import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from '../../../components/Auth/LoginForm';
import { useAuth } from '../../../contexts/AuthContext';

// Mock the useAuth hook
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  Box: ({ children, sx, ...props }: any) => (
    <div data-testid="box" style={sx} {...props}>{children}</div>
  ),
  Paper: ({ children, elevation, ...props }: any) => (
    <div data-testid="paper" data-elevation={elevation} {...props}>{children}</div>
  ),
  Typography: ({ children, variant, ...props }: any) => (
    <div data-testid={`typography-${variant}`} {...props}>{children}</div>
  ),
  TextField: ({ label, value, onChange, error, helperText, type, ...props }: any) => (
    <div data-testid="text-field-container">
      <label data-testid="text-field-label">{label}</label>
      <input
        data-testid="text-field"
        data-label={label}
        type={type}
        value={value || ''}
        onChange={(e) => onChange?.(e)}
        data-error={!!error}
        {...props}
      />
      {error && <div data-testid="text-field-error">{error}</div>}
      {helperText && <div data-testid="text-field-helper">{helperText}</div>}
    </div>
  ),
  Button: ({ children, onClick, variant, disabled, loading, ...props }: any) => (
    <button
      data-testid={`button-${variant || 'default'}`}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
  Link: ({ children, onClick, ...props }: any) => (
    <button data-testid="link" onClick={onClick} {...props}>{children}</button>
  ),
  Alert: ({ children, severity, ...props }: any) => (
    <div data-testid={`alert-${severity}`} {...props}>{children}</div>
  ),
  CircularProgress: (props: any) => (
    <div data-testid="circular-progress" {...props} />
  ),
}));

const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('LoginForm', () => {
  const mockLogin = vi.fn();
  const mockOnSwitchToRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: mockLogin,
      logout: vi.fn(),
      signup: vi.fn(),
    });
  });

  test('renders login form elements', () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    
    expect(screen.getByTestId('button-contained')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  test('handles email input changes', () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    expect(emailInput).toHaveValue('test@example.com');
  });

  test('handles password input changes', () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(passwordInput).toHaveValue('password123');
  });

  test('validates email format', async () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('validates required fields', async () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const submitButton = screen.getByTestId('button-contained');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('validates password length', async () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('submits form with valid data', async () => {
    mockLogin.mockResolvedValue(undefined);

    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  test('shows loading state during login', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      login: mockLogin,
      logout: vi.fn(),
      signup: vi.fn(),
    });

    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const submitButton = screen.getByTestId('button-contained');
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Signing In...')).toBeInTheDocument();
  });

  test('handles login errors', async () => {
    const error = new Error('Invalid credentials');
    mockLogin.mockRejectedValue(error);

    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('alert-error')).toBeInTheDocument();
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  test('calls onSwitchToRegister when register link is clicked', () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const registerLink = screen.getByText("Don't have an account? Sign up");
    fireEvent.click(registerLink);

    expect(mockOnSwitchToRegister).toHaveBeenCalledTimes(1);
  });

  test('shows forgot password link', () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
  });

  test('handles form submission on Enter key', async () => {
    mockLogin.mockResolvedValue(undefined);

    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.keyDown(passwordInput, { key: 'Enter' });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  test('has proper form structure and styling', () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByTestId('paper')).toBeInTheDocument();
    expect(screen.getAllByTestId('box')).toHaveLength(3); // Multiple Box components for layout
  });

  test('clears error on new input', async () => {
    const error = new Error('Invalid credentials');
    mockLogin.mockRejectedValue(error);

    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByTestId('button-contained');

    // Trigger error
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('alert-error')).toBeInTheDocument();
    });

    // Change input should clear error
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

    expect(screen.queryByTestId('alert-error')).not.toBeInTheDocument();
  });

  test('has correct input types', () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('handles network errors gracefully', async () => {
    const networkError = new Error('Network error');
    mockLogin.mockRejectedValue(networkError);

    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});