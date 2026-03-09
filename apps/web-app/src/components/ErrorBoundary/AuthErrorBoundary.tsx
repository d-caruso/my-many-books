import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthErrorFallback } from './AuthErrorFallback';
import { logger } from '../../utils/logger';

interface AuthErrorBoundaryProps {
  children: ReactNode;
}

export const AuthErrorBoundary: React.FC<AuthErrorBoundaryProps> = ({
  children
}) => {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <AuthErrorFallback error={error} reset={reset} />
      )}
      onError={(error, errorInfo) => {
        logger.error('Auth Error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
