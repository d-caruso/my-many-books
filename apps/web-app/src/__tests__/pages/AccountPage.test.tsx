import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AccountPage from '../../pages/AccountPage';
import { AuthApiError, useAuth } from '@my-many-books/shared-auth';

vi.mock('@my-many-books/shared-auth', async () => {
  const actual = await vi.importActual<typeof import('@my-many-books/shared-auth')>(
    '@my-many-books/shared-auth'
  );
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

const mockUseAuth = vi.mocked(useAuth);

describe('AccountPage', () => {
  const mockChangePassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        surname: 'Example',
        role: 'user',
        isActive: true,
      },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      verifyEmail: vi.fn(),
      resendCode: vi.fn(),
      changePassword: mockChangePassword,
      requestPasswordReset: vi.fn(),
      confirmPasswordReset: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: true,
    });
  });

  test('submits password change when form is valid', async () => {
    mockChangePassword.mockResolvedValue(undefined);

    render(<AccountPage />);

    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'CurrentPass123' },
    });
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'NewPass123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'NewPass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'CurrentPass123',
        newPassword: 'NewPass123',
        locale: 'en',
      });
    });

    expect(screen.getByText('Password updated successfully.')).toBeInTheDocument();
  });

  test('shows translated API error when password change fails', async () => {
    mockChangePassword.mockRejectedValue(
      new AuthApiError('AUTH_FAILED', 'Current password is incorrect', 'common:invalid_credentials')
    );

    render(<AccountPage />);

    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'wrong' },
    });
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'NewPass123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'NewPass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  test('renders guided tour target ids for the password section and submit button', () => {
    const { container } = render(<AccountPage />);

    expect(container.querySelector('[data-tour-id="account-password-section"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Change password' })).toHaveAttribute(
      'data-tour-id',
      'account-password-save-btn'
    );
  });
});
