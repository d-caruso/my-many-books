import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RegisterForm } from '../../../components/Auth/RegisterForm';
import { useAuth } from '../../../contexts/AuthContext';

// Mock the useAuth hook
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock Material-UI components
jest.mock('@mui/material', () => ({
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

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('RegisterForm', () => {
  const mockSignup = jest.fn();
  const mockOnSwitchToLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      signup: mockSignup,
    });
  });

  test('renders registration form elements', () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText('Join our community of book lovers')).toBeInTheDocument();
    
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    
    expect(screen.getByTestId('button-contained')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  test('handles name input changes', () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });

    expect(nameInput).toHaveValue('John Doe');
  });

  test('handles email input changes', () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });

    expect(emailInput).toHaveValue('john@example.com');
  });

  test('handles password input changes', () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(passwordInput).toHaveValue('password123');
  });

  test('handles confirm password input changes', () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    expect(confirmPasswordInput).toHaveValue('password123');
  });

  test('validates required fields', async () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const submitButton = screen.getByTestId('button-contained');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    expect(mockSignup).not.toHaveBeenCalled();
  });

  test('validates email format', async () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    expect(mockSignup).not.toHaveBeenCalled();
  });

  test('validates password length', async () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });

    expect(mockSignup).not.toHaveBeenCalled();
  });

  test('validates password confirmation', async () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    expect(mockSignup).not.toHaveBeenCalled();
  });

  test('submits form with valid data', async () => {
    mockSignup.mockResolvedValue(undefined);

    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('john@example.com', 'password123', 'John Doe');
    });
  });

  test('shows loading state during registration', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      login: jest.fn(),
      logout: jest.fn(),
      signup: mockSignup,
    });

    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const submitButton = screen.getByTestId('button-contained');
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Signing Up...')).toBeInTheDocument();
  });

  test('handles registration errors', async () => {
    const error = new Error('Email already exists');
    mockSignup.mockRejectedValue(error);

    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('alert-error')).toBeInTheDocument();
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });

  test('calls onSwitchToLogin when login link is clicked', () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const loginLink = screen.getByText('Already have an account? Sign in');
    fireEvent.click(loginLink);

    expect(mockOnSwitchToLogin).toHaveBeenCalledTimes(1);
  });

  test('handles form submission on Enter key', async () => {
    mockSignup.mockResolvedValue(undefined);

    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.keyDown(confirmPasswordInput, { key: 'Enter' });

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('john@example.com', 'password123', 'John Doe');
    });
  });

  test('has proper form structure and styling', () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByTestId('paper')).toBeInTheDocument();
    expect(screen.getAllByTestId('box')).toHaveLength(3); // Multiple Box components for layout
  });

  test('clears error on new input', async () => {
    const error = new Error('Email already exists');
    mockSignup.mockRejectedValue(error);

    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByTestId('button-contained');

    // Trigger error
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('alert-error')).toBeInTheDocument();
    });

    // Change input should clear error
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });

    expect(screen.queryByTestId('alert-error')).not.toBeInTheDocument();
  });

  test('has correct input types', () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');

    expect(nameInput).toHaveAttribute('type', 'text');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
  });

  test('validates name length', async () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(nameInput, { target: { value: 'A' } }); // Too short
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
    });

    expect(mockSignup).not.toHaveBeenCalled();
  });

  test('handles network errors gracefully', async () => {
    const networkError = new Error('Network error');
    mockSignup.mockRejectedValue(networkError);

    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByTestId('button-contained');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});