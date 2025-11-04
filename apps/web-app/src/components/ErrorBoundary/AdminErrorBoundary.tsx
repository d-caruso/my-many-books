import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AdminErrorFallback } from './AdminErrorFallback';

interface AdminErrorBoundaryProps {
  children: ReactNode;
}

export const AdminErrorBoundary: React.FC<AdminErrorBoundaryProps> = ({
  children
}) => {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <AdminErrorFallback error={error} reset={reset} />
      )}
      onError={(error, errorInfo) => {
        console.error('Admin Section Error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
