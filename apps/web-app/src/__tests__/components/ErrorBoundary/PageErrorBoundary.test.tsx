import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PageErrorBoundary } from '../../../components/ErrorBoundary';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { BrowserRouter } from 'react-router-dom';

const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Page rendering error');
  }
  return <div>Page Content</div>;
};

describe('PageErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <PageErrorBoundary pageName="Test Page">
            <ThrowError shouldThrow={false} />
          </PageErrorBoundary>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('renders error fallback when error occurs', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <PageErrorBoundary pageName="Test Page">
            <ThrowError />
          </PageErrorBoundary>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByTestId('page-error-fallback')).toBeInTheDocument();
  });

  it('displays retry and home buttons', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <PageErrorBoundary>
            <ThrowError />
          </PageErrorBoundary>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByTestId('retry-page')).toBeInTheDocument();
    expect(screen.getByTestId('go-home-page')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <PageErrorBoundary>
            <ThrowError />
          </PageErrorBoundary>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Page rendering error')).toBeInTheDocument();
  });
});
