import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { RegisterForm } from '../../../components/Auth/RegisterForm';
import { useAuth } from '@my-many-books/shared-auth';
import { setupMuiMock } from '../../test-utils/setupMuiMock';


// Mock the useAuth hook
vi.mock('@my-many-books/shared-auth', () => ({
  useAuth: vi.fn(),
}));

// Mock Material-UI components
setupMuiMock();

const mockUseAuth = vi.mocked(useAuth);

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

const getInput = (label: RegExp | string) =>
  screen.getByLabelText(label, { selector: 'input' });

describe('RegisterForm', () => {
  const mockRegister = vi.fn();
  const mockOnSwitchToLogin = vi.fn();
  const renderRegisterForm = () =>
    render(<RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />, { wrapper: TestWrapper });

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
    renderRegisterForm();

    // Use getAllByText since "Create Account" appears twice (header and button)
    expect(screen.getAllByText('Create Account')[0]).toBeInTheDocument();
    expect(screen.getByText('Join My Many Books today')).toBeInTheDocument();

    expect(getInput(/First Name/i)).toBeInTheDocument();
    expect(getInput(/Last Name/i)).toBeInTheDocument();
    expect(getInput(/Email/i)).toBeInTheDocument();
    expect(getInput(/^Password\b/i)).toBeInTheDocument();
    expect(getInput(/Confirm Password/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  test('handles name input changes', () => {
    renderRegisterForm();

    const nameInput = getInput(/First Name/i);
    fireEvent.change(nameInput, { target: { value: 'John' } });

    expect(nameInput).toHaveValue('John');
  });

  test('handles email input changes', () => {
    renderRegisterForm();

    const emailInput = getInput(/Email/i);
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });

    expect(emailInput).toHaveValue('john@example.com');
  });

  test('handles password input changes', () => {
    renderRegisterForm();

    const passwordInput = getInput(/^Password\b/i);
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(passwordInput).toHaveValue('password123');
  });

  test('handles confirm password input changes', () => {
    renderRegisterForm();

    const confirmPasswordInput = getInput(/Confirm Password/i);
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    expect(confirmPasswordInput).toHaveValue('password123');
  });

  test('validates required fields', async () => {
    renderRegisterForm();

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).not.toHaveBeenCalled();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('validates email format', async () => {
    renderRegisterForm();

    const emailInput = getInput(/Email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput.validity.valid).toBe(false);
  });

  test('validates password length', async () => {
    renderRegisterForm();

    const nameInput = getInput(/First Name/i);
    const surnameInput = getInput(/Last Name/i);
    const emailInput = getInput(/Email/i);
    const passwordInput = getInput(/^Password\b/i);
    const confirmPasswordInput = getInput(/Confirm Password/i);
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
    renderRegisterForm();

    const nameInput = getInput(/First Name/i);
    const surnameInput = getInput(/Last Name/i);
    const emailInput = getInput(/Email/i);
    const passwordInput = getInput(/^Password\b/i);
    const confirmPasswordInput = getInput(/Confirm Password/i);
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

    renderRegisterForm();

    const nameInput = getInput(/First Name/i);
    const surnameInput = getInput(/Last Name/i);
    const emailInput = getInput(/Email/i);
    const passwordInput = getInput(/^Password\b/i);
    const confirmPasswordInput = getInput(/Confirm Password/i);
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

    renderRegisterForm();

    const nameInput = getInput(/First Name/i);
    const surnameInput = getInput(/Last Name/i);
    const emailInput = getInput(/Email/i);
    const passwordInput = getInput(/^Password\b/i);
    const confirmPasswordInput = getInput(/Confirm Password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    fireEvent.change(nameInput, { target: { value: 'John' } });
    fireEvent.change(surnameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
    fireEvent.click(submitButton);

    // Button should be disabled during submission
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Creating Account...');
  });

  test('handles registration errors', async () => {
    const error = new Error('Email already exists');
    mockRegister.mockRejectedValue(error);

    renderRegisterForm();

    const nameInput = getInput(/First Name/i);
    const surnameInput = getInput(/Last Name/i);
    const emailInput = getInput(/Email/i);
    const passwordInput = getInput(/^Password\b/i);
    const confirmPasswordInput = getInput(/Confirm Password/i);
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
    renderRegisterForm();

    const loginLink = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(loginLink);

    expect(mockOnSwitchToLogin).toHaveBeenCalledTimes(1);
  });

  test('handles form submission on Enter key', async () => {
    mockRegister.mockResolvedValue(undefined);

    renderRegisterForm();

    const nameInput = getInput(/First Name/i);
    const surnameInput = getInput(/Last Name/i);
    const emailInput = getInput(/Email/i);
    const passwordInput = getInput(/^Password\b/i);
    const confirmPasswordInput = getInput(/Confirm Password/i);

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
    renderRegisterForm();

    const form = screen.getByRole('form', { name: /registration form/i });
    expect(form).toBeInTheDocument();
    expect(screen.getAllByText(/create account/i).length).toBeGreaterThan(0);
  });

  test('clears error on new input', async () => {
    const error = new Error('Email already exists');
    mockRegister.mockRejectedValue(error);

    renderRegisterForm();

    const nameInput = getInput(/First Name/i);
    const surnameInput = getInput(/Last Name/i);
    const emailInput = getInput(/Email/i);
    const passwordInput = getInput(/^Password\b/i);
    const confirmPasswordInput = getInput(/Confirm Password/i);
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
    renderRegisterForm();

    const nameInput = getInput(/First Name/i);
    const surnameInput = getInput(/Last Name/i);
    const emailInput = getInput(/Email/i);
    const passwordInput = getInput(/^Password\b/i);
    const confirmPasswordInput = getInput(/Confirm Password/i);

    expect(nameInput).toHaveAttribute('type', 'text');
    expect(surnameInput).toHaveAttribute('type', 'text');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
  });

  test('validates name length', async () => {
    renderRegisterForm();

    const nameInput = getInput(/First Name/i);
    const surnameInput = getInput(/Last Name/i);
    const emailInput = getInput(/Email/i);
    const passwordInput = getInput(/^Password\b/i);
    const confirmPasswordInput = getInput(/Confirm Password/i);
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

    renderRegisterForm();

    const nameInput = getInput(/First Name/i);
    const surnameInput = getInput(/Last Name/i);
    const emailInput = getInput(/Email/i);
    const passwordInput = getInput(/^Password\b/i);
    const confirmPasswordInput = getInput(/Confirm Password/i);
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
