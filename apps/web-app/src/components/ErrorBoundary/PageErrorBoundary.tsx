import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { PageErrorFallback } from './PageErrorFallback';
import { logger } from '../../utils/logger';

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
}

export const PageErrorBoundary: React.FC<PageErrorBoundaryProps> = ({
  children,
  pageName
}) => {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <PageErrorFallback error={error} reset={reset} pageName={pageName} />
      )}
      onError={(error, errorInfo) => {
        logger.error(`Page Error ${pageName ? `(${pageName})` : ''}:`, error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
