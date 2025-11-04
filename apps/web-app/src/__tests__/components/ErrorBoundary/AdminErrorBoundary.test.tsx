import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminErrorBoundary } from '../../../components/ErrorBoundary';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { BrowserRouter } from 'react-router-dom';

const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Admin section error');
  }
  return <div>Admin Content</div>;
};

describe('AdminErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <AdminErrorBoundary>
            <ThrowError shouldThrow={false} />
          </AdminErrorBoundary>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('renders error fallback when error occurs', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <AdminErrorBoundary>
            <ThrowError />
          </AdminErrorBoundary>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByTestId('admin-error-fallback')).toBeInTheDocument();
  });

  it('displays retry and go home buttons', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <AdminErrorBoundary>
            <ThrowError />
          </AdminErrorBoundary>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByTestId('retry-admin')).toBeInTheDocument();
    expect(screen.getByTestId('go-home')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <AdminErrorBoundary>
            <ThrowError />
          </AdminErrorBoundary>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Admin section error')).toBeInTheDocument();
  });
});
