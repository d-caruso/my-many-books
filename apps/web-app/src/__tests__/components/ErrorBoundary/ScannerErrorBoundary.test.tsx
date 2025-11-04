import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScannerErrorBoundary } from '../../../components/ErrorBoundary';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';

const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Permission denied');
  }
  return <div>Scanner Content</div>;
};

describe('ScannerErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ScannerErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ScannerErrorBoundary>
      </I18nextProvider>
    );

    expect(screen.getByText('Scanner Content')).toBeInTheDocument();
  });

  it('renders error fallback when error occurs', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ScannerErrorBoundary>
          <ThrowError />
        </ScannerErrorBoundary>
      </I18nextProvider>
    );

    expect(screen.getByTestId('scanner-error-fallback')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();

    render(
      <I18nextProvider i18n={i18n}>
        <ScannerErrorBoundary onClose={onClose}>
          <ThrowError />
        </ScannerErrorBoundary>
      </I18nextProvider>
    );

    const closeButton = screen.getByTestId('close-scanner-error');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays retry button in error fallback', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ScannerErrorBoundary>
          <ThrowError />
        </ScannerErrorBoundary>
      </I18nextProvider>
    );

    expect(screen.getByTestId('scanner-error-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('retry-scanner')).toBeInTheDocument();
  });

  it('handles permission denied errors', () => {
    const ThrowPermissionError: React.FC = () => {
      throw new Error('Permission denied');
    };

    render(
      <I18nextProvider i18n={i18n}>
        <ScannerErrorBoundary>
          <ThrowPermissionError />
        </ScannerErrorBoundary>
      </I18nextProvider>
    );

    expect(screen.getByTestId('scanner-error-fallback')).toBeInTheDocument();
  });

  it('handles NotFoundError for no camera', () => {
    const ThrowNotFoundError: React.FC = () => {
      throw new Error('NotFoundError: No camera available');
    };

    render(
      <I18nextProvider i18n={i18n}>
        <ScannerErrorBoundary>
          <ThrowNotFoundError />
        </ScannerErrorBoundary>
      </I18nextProvider>
    );

    expect(screen.getByTestId('scanner-error-fallback')).toBeInTheDocument();
  });

  it('handles NotReadableError for camera in use', () => {
    const ThrowNotReadableError: React.FC = () => {
      throw new Error('NotReadableError: Camera is in use');
    };

    render(
      <I18nextProvider i18n={i18n}>
        <ScannerErrorBoundary>
          <ThrowNotReadableError />
        </ScannerErrorBoundary>
      </I18nextProvider>
    );

    expect(screen.getByTestId('scanner-error-fallback')).toBeInTheDocument();
  });
});
