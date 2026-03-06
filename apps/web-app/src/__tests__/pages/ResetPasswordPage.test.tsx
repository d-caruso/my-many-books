import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from '../../pages/ResetPasswordPage';
import { useAuth } from '@my-many-books/shared-auth';

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

const renderPage = (path = '/auth/reset-password?email=user@example.com&code=123456') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ResetPasswordPage />
    </MemoryRouter>
  );

describe('ResetPasswordPage', () => {
  const mockConfirmPasswordReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      verifyEmail: vi.fn(),
      resendCode: vi.fn(),
      changePassword: vi.fn(),
      requestPasswordReset: vi.fn(),
      confirmPasswordReset: mockConfirmPasswordReset,
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: false,
    });
  });

  test('submits reset confirmation and shows success message', async () => {
    mockConfirmPasswordReset.mockResolvedValue({ reset: true, signInRequired: true });

    renderPage();

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'NewPass123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'NewPass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Set new password' }));

    await waitFor(() => {
      expect(mockConfirmPasswordReset).toHaveBeenCalledWith({
        email: 'user@example.com',
        code: '123456',
        newPassword: 'NewPass123',
        locale: 'en',
      });
    });

    expect(
      screen.getByText('Password reset completed. Sign in with your new password.')
    ).toBeInTheDocument();
  });

  test('shows confirmation validation error when passwords do not match', async () => {
    renderPage('/auth/reset-password');

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Reset code'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'NewPass123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'Mismatch123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Set new password' }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
    expect(mockConfirmPasswordReset).not.toHaveBeenCalled();
  });
});
