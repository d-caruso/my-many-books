import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from '../../pages/ForgotPasswordPage';
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

const renderPage = () =>
  render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>
  );

describe('ForgotPasswordPage', () => {
  const mockRequestPasswordReset = vi.fn();

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
      requestPasswordReset: mockRequestPasswordReset,
      confirmPasswordReset: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: false,
    });
  });

  test('submits forgot password request and shows generic success message', async () => {
    mockRequestPasswordReset.mockResolvedValue({ accepted: true, expiresInMinutes: 60 });

    renderPage();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send reset instructions' }));

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith('user@example.com');
    });

    expect(
      screen.getByText('If an account exists for user@example.com, reset instructions have been sent.')
    ).toBeInTheDocument();
  });

  test('keeps submit disabled when email is missing', () => {
    renderPage();

    expect(screen.getByRole('button', { name: 'Send reset instructions' })).toBeDisabled();
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });
});
