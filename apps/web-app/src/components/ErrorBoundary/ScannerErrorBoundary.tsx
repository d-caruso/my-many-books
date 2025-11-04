import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ScannerErrorFallback } from './ScannerErrorFallback';

interface ScannerErrorBoundaryProps {
  children: ReactNode;
  onClose?: () => void;
}

export const ScannerErrorBoundary: React.FC<ScannerErrorBoundaryProps> = ({
  children,
  onClose
}) => {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <ScannerErrorFallback error={error} reset={reset} onClose={onClose} />
      )}
      onError={(error, errorInfo) => {
        console.error('Scanner Error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
