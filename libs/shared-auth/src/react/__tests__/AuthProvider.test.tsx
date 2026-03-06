import React, { useState } from 'react';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { AuthService } from '../../AuthService';
import type {
  AuthState,
  RegisterResponse,
  ForgotPasswordResponse,
  ConfirmPasswordResetResponse,
  User,
} from '../../types';
import { AuthProvider, useAuth } from '../AuthProvider';

const user: User = {
  id: 1,
  email: 'test@example.com',
  name: 'Test',
  surname: 'User',
  role: 'user',
  isActive: true,
};

function createAuthServiceMock(overrides?: Partial<AuthService>): AuthService {
  const base: Partial<AuthService> = {
    getAuthState: jest.fn<Promise<AuthState>, []>().mockResolvedValue({
      user: null,
      isAuthenticated: false,
    }),
    login: jest.fn(),
    register: jest.fn(),
    verifyEmail: jest.fn(),
    resendCode: jest.fn(),
    changePassword: jest.fn(),
    requestPasswordReset: jest.fn(),
    confirmPasswordReset: jest.fn(),
    logout: jest.fn(),
  };

  return { ...base, ...overrides } as unknown as AuthService;
}

function Consumer() {
  const {
    user: currentUser,
    loading,
    login,
    register,
    changePassword,
    requestPasswordReset,
    confirmPasswordReset,
    logout,
    refreshUser,
    isAuthenticated,
  } = useAuth();
  const [registerMessage, setRegisterMessage] = useState<string>('');
  const [forgotMessage, setForgotMessage] = useState<string>('');
  const [confirmMessage, setConfirmMessage] = useState<string>('');

  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="isAuthenticated">{String(isAuthenticated)}</div>
      <div data-testid="userEmail">{currentUser?.email ?? 'none'}</div>
      <div data-testid="registerMessage">{registerMessage}</div>
      <div data-testid="forgotMessage">{forgotMessage}</div>
      <div data-testid="confirmMessage">{confirmMessage}</div>

      <button type="button" onClick={() => void login('test@example.com', 'password')}>
        login
      </button>
      <button
        type="button"
        onClick={() =>
          void register({
            email: 'new@example.com',
            password: 'password',
            name: 'New',
            surname: 'User',
          }).then((res) => setRegisterMessage(res.message))
        }
      >
        register
      </button>
      <button type="button" onClick={() => void logout()}>
        logout
      </button>
      <button
        type="button"
        onClick={() =>
          void changePassword({
            currentPassword: 'CurrentPass123',
            newPassword: 'NewPass123',
          })
        }
      >
        changePassword
      </button>
      <button
        type="button"
        onClick={() =>
          void requestPasswordReset('test@example.com').then((res) =>
            setForgotMessage(String(res.expiresInMinutes))
          )
        }
      >
        requestReset
      </button>
      <button
        type="button"
        onClick={() =>
          void confirmPasswordReset({
            email: 'test@example.com',
            code: '123456',
            newPassword: 'NewPass123',
          }).then((res) => setConfirmMessage(String(res.reset)))
        }
      >
        confirmReset
      </button>
      <button type="button" onClick={() => void refreshUser()}>
        refreshUser
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  it('throws if useAuth is used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
  });

  it('renders loadingComponent during initial auth check, then renders children', async () => {
    const authService = createAuthServiceMock();

    render(
      <AuthProvider
        authService={authService}
        loadingComponent={<div data-testid="loadingComponent">Loading custom...</div>}
      >
        <div data-testid="content">content</div>
      </AuthProvider>
    );

    expect(screen.getByTestId('loadingComponent')).toBeInTheDocument();
    await screen.findByTestId('content');
    expect(authService.getAuthState).toHaveBeenCalledTimes(1);
  });

  it('handles getAuthState failure and still renders children', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const authService = createAuthServiceMock({
      getAuthState: jest.fn().mockRejectedValue(new Error('boom')),
    });

    render(
      <AuthProvider authService={authService}>
        <div data-testid="content">content</div>
      </AuthProvider>
    );

    await screen.findByTestId('content');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Auth state check failed:',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  it('supports login and updates user + loading state', async () => {
    let resolveLogin!: (value: User) => void;
    const loginPromise = new Promise<User>((resolve) => {
      resolveLogin = resolve;
    });

    const authService = createAuthServiceMock({
      login: jest.fn().mockReturnValue(loginPromise),
    });

    render(
      <AuthProvider authService={authService}>
        <Consumer />
      </AuthProvider>
    );

    await screen.findByTestId('userEmail');
    fireEvent.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('true'));
    resolveLogin(user);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('userEmail')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('supports register and returns the RegisterResponse', async () => {
    const registerResponse: RegisterResponse = {
      success: true,
      requiresVerification: false,
      message: 'ok',
    };

    const authService = createAuthServiceMock({
      register: jest.fn().mockResolvedValue(registerResponse),
    });

    render(
      <AuthProvider authService={authService}>
        <Consumer />
      </AuthProvider>
    );

    await screen.findByTestId('userEmail');
    fireEvent.click(screen.getByRole('button', { name: 'register' }));

    await waitFor(() => expect(screen.getByTestId('registerMessage')).toHaveTextContent('ok'));
    expect(authService.register).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password',
      name: 'New',
      surname: 'User',
    });
  });

  it('supports changePassword and refreshes user state from auth service', async () => {
    const updatedUser = { ...user, name: 'Updated' };
    const authService = createAuthServiceMock({
      getAuthState: jest.fn().mockResolvedValue({ user, isAuthenticated: true }),
      changePassword: jest.fn().mockResolvedValue(updatedUser),
    });

    render(
      <AuthProvider authService={authService}>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true'));
    fireEvent.click(screen.getByRole('button', { name: 'changePassword' }));

    await waitFor(() => expect(screen.getByTestId('userEmail')).toHaveTextContent(updatedUser.email));
    expect(authService.changePassword).toHaveBeenCalledWith({
      userId: 1,
      currentPassword: 'CurrentPass123',
      newPassword: 'NewPass123',
      locale: undefined,
    });
  });

  it('supports requestPasswordReset and returns API payload', async () => {
    const response: ForgotPasswordResponse = { accepted: true, expiresInMinutes: 60 };
    const authService = createAuthServiceMock({
      requestPasswordReset: jest.fn().mockResolvedValue(response),
    });

    render(
      <AuthProvider authService={authService}>
        <Consumer />
      </AuthProvider>
    );

    await screen.findByTestId('userEmail');
    fireEvent.click(screen.getByRole('button', { name: 'requestReset' }));

    await waitFor(() => expect(screen.getByTestId('forgotMessage')).toHaveTextContent('60'));
    expect(authService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
  });

  it('supports confirmPasswordReset and returns API payload', async () => {
    const response: ConfirmPasswordResetResponse = { reset: true, signInRequired: true };
    const authService = createAuthServiceMock({
      confirmPasswordReset: jest.fn().mockResolvedValue(response),
    });

    render(
      <AuthProvider authService={authService}>
        <Consumer />
      </AuthProvider>
    );

    await screen.findByTestId('userEmail');
    fireEvent.click(screen.getByRole('button', { name: 'confirmReset' }));

    await waitFor(() => expect(screen.getByTestId('confirmMessage')).toHaveTextContent('true'));
    expect(authService.confirmPasswordReset).toHaveBeenCalledWith({
      email: 'test@example.com',
      code: '123456',
      newPassword: 'NewPass123',
    });
  });

  it('supports logout and clears user', async () => {
    const authService = createAuthServiceMock({
      getAuthState: jest.fn().mockResolvedValue({ user, isAuthenticated: true }),
      logout: jest.fn().mockResolvedValue(undefined),
    });

    render(
      <AuthProvider authService={authService}>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true'));
    fireEvent.click(screen.getByRole('button', { name: 'logout' }));
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false'));
    expect(screen.getByTestId('userEmail')).toHaveTextContent('none');
    expect(authService.logout).toHaveBeenCalledTimes(1);
  });

  it('supports refreshUser and updates user', async () => {
    const updatedUser = { ...user, name: 'Updated' };
    const authService = createAuthServiceMock({
      getAuthState: jest
        .fn()
        .mockResolvedValueOnce({ user, isAuthenticated: true })
        .mockResolvedValueOnce({ user: updatedUser, isAuthenticated: true }),
    });

    render(
      <AuthProvider authService={authService}>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('userEmail')).toHaveTextContent(user.email));
    fireEvent.click(screen.getByRole('button', { name: 'refreshUser' }));
    await waitFor(() =>
      expect(screen.getByTestId('userEmail')).toHaveTextContent(updatedUser.email)
    );
    expect(authService.getAuthState).toHaveBeenCalledTimes(2);
  });

  it('refreshUser throws when user is null after getAuthState', async () => {
    const authService = createAuthServiceMock({
      getAuthState: jest
        .fn()
        .mockResolvedValueOnce({ user, isAuthenticated: true })
        .mockResolvedValueOnce({ user: null, isAuthenticated: false }),
    });

    let caughtError: Error | undefined;
    function ConsumerWithErrorCapture() {
      const { refreshUser: refresh } = useAuth();
      return (
        <button
          type="button"
          onClick={() =>
            refresh().catch((e: Error) => {
              caughtError = e;
            })
          }
        >
          refreshUser
        </button>
      );
    }

    render(
      <AuthProvider authService={authService}>
        <ConsumerWithErrorCapture />
      </AuthProvider>
    );

    await screen.findByRole('button', { name: 'refreshUser' });
    fireEvent.click(screen.getByRole('button', { name: 'refreshUser' }));
    await waitFor(() => expect(caughtError).toBeDefined());
    expect(caughtError?.message).toBe('Failed to restore session');
  });
});
