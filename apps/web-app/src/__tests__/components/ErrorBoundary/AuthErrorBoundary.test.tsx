import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthErrorBoundary } from '../../../components/ErrorBoundary';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { BrowserRouter } from 'react-router-dom';

const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Auth configuration error');
  }
  return <div>Auth Content</div>;
};

describe('AuthErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <AuthErrorBoundary>
            <ThrowError shouldThrow={false} />
          </AuthErrorBoundary>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Auth Content')).toBeInTheDocument();
  });

  it('renders error fallback when error occurs', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <AuthErrorBoundary>
            <ThrowError />
          </AuthErrorBoundary>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByTestId('auth-error-fallback')).toBeInTheDocument();
  });

  it('displays retry and login buttons', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <AuthErrorBoundary>
            <ThrowError />
          </AuthErrorBoundary>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByTestId('retry-auth')).toBeInTheDocument();
    expect(screen.getByTestId('go-login')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <AuthErrorBoundary>
            <ThrowError />
          </AuthErrorBoundary>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Auth configuration error')).toBeInTheDocument();
  });
});
