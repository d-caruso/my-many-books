import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { DataGridErrorFallback } from './DataGridErrorFallback';

interface DataGridErrorBoundaryProps {
  children: ReactNode;
}

export const DataGridErrorBoundary: React.FC<DataGridErrorBoundaryProps> = ({
  children
}) => {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <DataGridErrorFallback error={error} reset={reset} />
      )}
      onError={(error, errorInfo) => {
        console.error('DataGrid Error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
