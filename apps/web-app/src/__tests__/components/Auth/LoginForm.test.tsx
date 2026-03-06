import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from '../../../components/Auth/LoginForm';
import { useAuth } from '@my-many-books/shared-auth';
import { POST_LOGIN_WELCOME_STORAGE_KEY } from '@my-many-books/shared-types';
import { setupMuiMock } from '../../test-utils/setupMuiMock';

// Mock the useAuth hook
vi.mock('@my-many-books/shared-auth', async () => {
  const actual = await vi.importActual<typeof import('@my-many-books/shared-auth')>('@my-many-books/shared-auth');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

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
    window.sessionStorage.clear();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: false,
    });
  });

  test('renders login form elements', () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByText(/Password must be at least 8 characters long and contain/i)).toBeInTheDocument();

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
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });

    expect(passwordInput).toHaveValue('Password123');
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
      expect(screen.getAllByText(/Password must be at least 8 characters long and contain/i).length).toBeGreaterThan(0);
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
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'Password123');
    });
    expect(window.sessionStorage.getItem(POST_LOGIN_WELCOME_STORAGE_KEY)).toBe('1');
  });

  test('shows loading state during login', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: false,
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
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
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

  test('starts Google OAuth flow when Continue with Google is clicked', () => {
    const assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});

    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    fireEvent.click(screen.getByTestId('google-login-button'));

    expect(assignSpy).toHaveBeenCalledWith(expect.stringContaining('/auth/google/start?platform=web'));
    assignSpy.mockRestore();
  });

  test('shows forgot password action', () => {
    render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByTestId('forgot-password-button')).toBeInTheDocument();
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
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.keyDown(passwordInput, { key: 'Enter' });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'Password123');
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
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
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
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
