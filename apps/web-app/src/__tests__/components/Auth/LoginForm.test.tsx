import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from '../../../components/Auth/LoginForm';
import { useAuth } from '@my-many-books/shared-auth';
import { setupMuiMock } from '../../test-utils/setupMuiMock';

// Mock the useAuth hook
vi.mock('@my-many-books/shared-auth', () => ({
  useAuth: vi.fn(),
}));

setupMuiMock();

const mockUseAuth = vi.mocked(useAuth);

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

    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByText('Welcome back to My Many Books')).toBeInTheDocument();

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
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

  test('toggles password visibility with eye button', () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const passwordInput = screen.getByLabelText('Password');
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('validates email format', async () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

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

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('validates password length', async () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

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
    const submitButton = screen.getByRole('button', { name: /sign in/i });

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

    const submitButton = screen.getByRole('button', { name: /signing in/i });
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
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('alert-error')).toBeInTheDocument();
    });
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  test('calls onSwitchToRegister when register link is clicked', () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    const registerLink = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(registerLink);

    expect(mockOnSwitchToRegister).toHaveBeenCalledTimes(1);
  });

  test.skip('shows forgot password link', () => {
    // TODO: Add forgot password link to LoginForm
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

    // Check form structure exists
    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();

    // Check for email and password inputs
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
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
    const submitButton = screen.getByRole('button', { name: /sign in/i });

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
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
