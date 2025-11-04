import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataGridErrorBoundary } from '../../../components/ErrorBoundary';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';

const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('DataGrid rendering error');
  }
  return <div>DataGrid Content</div>;
};

describe('DataGridErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <DataGridErrorBoundary>
          <ThrowError shouldThrow={false} />
        </DataGridErrorBoundary>
      </I18nextProvider>
    );

    expect(screen.getByText('DataGrid Content')).toBeInTheDocument();
  });

  it('renders error fallback when error occurs', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <DataGridErrorBoundary>
          <ThrowError />
        </DataGridErrorBoundary>
      </I18nextProvider>
    );

    expect(screen.getByTestId('datagrid-error-fallback')).toBeInTheDocument();
  });

  it('displays retry button in error fallback', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <DataGridErrorBoundary>
          <ThrowError />
        </DataGridErrorBoundary>
      </I18nextProvider>
    );

    expect(screen.getByTestId('datagrid-error-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('retry-datagrid')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <DataGridErrorBoundary>
          <ThrowError />
        </DataGridErrorBoundary>
      </I18nextProvider>
    );

    expect(screen.getByText('DataGrid rendering error')).toBeInTheDocument();
  });
});
