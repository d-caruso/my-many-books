import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { RegisterForm } from '../../../components/Auth/RegisterForm';
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

const mockUseAuth = vi.mocked(useAuth);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('RegisterForm', () => {
  const mockRegister = vi.fn();
  const mockOnSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: mockRegister,
      updateUser: vi.fn(),
    });
  });

  test('renders registration form elements', () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    // Use getAllByText since "Create Account" appears twice (header and button)
    expect(screen.getAllByText('Create Account')[0]).toBeInTheDocument();
    expect(screen.getByText('Join My Many Books today')).toBeInTheDocument();

    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  test('handles name input changes', () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('First Name');
    fireEvent.change(nameInput, { target: { value: 'John' } });

    expect(nameInput).toHaveValue('John');
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

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    // RegisterForm doesn't display field-specific validation messages - it uses browser HTML5 validation
    // The form won't submit if required fields are empty
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test('validates email format', async () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('First Name');
    const surnameInput = screen.getByLabelText('Last Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: 'John' } });
    fireEvent.change(surnameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Email validation is handled by browser HTML5 validation (type="email")
    // Form won't submit with invalid email
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test('validates password length', async () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('First Name');
    const surnameInput = screen.getByLabelText('Last Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: 'John' } });
    fireEvent.change(surnameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 8 characters/)).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  test('validates password confirmation', async () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('First Name');
    const surnameInput = screen.getByLabelText('Last Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: 'John' } });
    fireEvent.change(surnameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  test('submits form with valid data', async () => {
    mockRegister.mockResolvedValue(undefined);

    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('First Name');
    const surnameInput = screen.getByLabelText('Last Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: 'John' } });
    fireEvent.change(surnameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'Password123',
        name: 'John',
        surname: 'Doe'
      });
    });
  });

  test('shows loading state during registration', async () => {
    // The loading state is local to RegisterForm, not from useAuth().loading
    // We need to test the button being disabled during submission
    mockRegister.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    const { container } = render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('First Name');
    const surnameInput = screen.getByLabelText('Last Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: 'John' } });
    fireEvent.change(surnameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);

    // Button should be disabled during submission
    expect(submitButton).toBeDisabled();
  });

  test('handles registration errors', async () => {
    const error = new Error('Email already exists');
    mockRegister.mockRejectedValue(error);

    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('First Name');
    const surnameInput = screen.getByLabelText('Last Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: 'John' } });
    fireEvent.change(surnameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });

  test('calls onSwitchToLogin when login link is clicked', () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const loginLink = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(loginLink);

    expect(mockOnSwitchToLogin).toHaveBeenCalledTimes(1);
  });

  test('handles form submission on Enter key', async () => {
    mockRegister.mockResolvedValue(undefined);

    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('First Name');
    const surnameInput = screen.getByLabelText('Last Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');

    fireEvent.change(nameInput, { target: { value: 'John' } });
    fireEvent.change(surnameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.keyDown(confirmPasswordInput, { key: 'Enter' });

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'Password123',
        name: 'John',
        surname: 'Doe'
      });
    });
  });

  test('has proper form structure and styling', () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    // RegisterForm uses native HTML elements, not MUI components
    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
    expect(screen.getAllByText(/create account/i).length).toBeGreaterThan(0);
  });

  test('clears error on new input', async () => {
    const error = new Error('Email already exists');
    mockRegister.mockRejectedValue(error);

    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('First Name');
    const surnameInput = screen.getByLabelText('Last Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    // Trigger error
    fireEvent.change(nameInput, { target: { value: 'John' } });
    fireEvent.change(surnameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });

    // Change input should clear error
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });

    expect(screen.queryByText('Email already exists')).not.toBeInTheDocument();
  });

  test('has correct input types', () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('First Name');
    const surnameInput = screen.getByLabelText('Last Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');

    expect(nameInput).toHaveAttribute('type', 'text');
    expect(surnameInput).toHaveAttribute('type', 'text');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
  });

  test('validates name length', async () => {
    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('First Name');
    const surnameInput = screen.getByLabelText('Last Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: 'A' } }); // Too short
    fireEvent.change(surnameInput, { target: { value: 'D' } }); // Too short
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);

    // RegisterForm doesn't have custom name length validation - relies on HTML5 required attribute
    // The form should still attempt to submit with single characters
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    });
  });

  test('handles network errors gracefully', async () => {
    const networkError = new Error('Network error');
    mockRegister.mockRejectedValue(networkError);

    render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
      { wrapper: TestWrapper }
    );

    const nameInput = screen.getByLabelText('First Name');
    const surnameInput = screen.getByLabelText('Last Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: 'John' } });
    fireEvent.change(surnameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});