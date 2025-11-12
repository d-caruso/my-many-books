import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePWAContext } from '../../contexts/PWAContext';

interface OfflineIndicatorProps {
  variant?: 'banner' | 'snackbar';
  showRetry?: boolean;
  onRetry?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  message?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  variant = 'banner',
  showRetry = false,
  onRetry,
  dismissible = false,
  onDismiss,
  message
}) => {
  const { t } = useTranslation();
  const { isOffline } = usePWAContext();
  const displayMessage = message || t('pwa:offline_indicator.you_are_offline');

  if (!isOffline) {
    return null;
  }

  if (variant === 'snackbar') {
    return (
      <div data-testid="snackbar" className="fixed bottom-4 left-4 right-4 bg-semantic-warning text-white p-4 rounded shadow-lg z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div 
              data-testid="wifi-off-icon"
              className="w-2 h-2 bg-white rounded-full animate-pulse"
            />
            <span>{displayMessage}</span>
          </div>
          <div className="flex items-center space-x-2">
            {showRetry && (
              <button
                data-testid="alert-action"
                onClick={onRetry}
                className="text-white underline hover:no-underline"
              >
                {t('pwa:offline_indicator.retry')}
              </button>
            )}
            {dismissible && (
              <button 
                data-testid="alert-close"
                onClick={onDismiss}
                className="text-white text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      data-testid="alert-warning"
      className="fixed top-0 left-0 right-0 bg-semantic-warning text-white px-4 py-2 text-center text-sm font-medium z-50"
    >
      <div className="flex items-center justify-center space-x-2">
        <div 
          data-testid="wifi-off-icon"
          className="w-2 h-2 bg-white rounded-full animate-pulse"
        />
        <div className="flex items-center space-x-1">
          <span>{displayMessage}</span>
          <span>{t('pwa:offline_indicator.features_limited')}</span>
        </div>
        {showRetry && (
          <button
            data-testid="alert-action"
            onClick={onRetry}
            className="ml-4 text-white underline hover:no-underline"
          >
            {t('pwa:offline_indicator.retry')}
          </button>
        )}
        {dismissible && (
          <button 
            data-testid="alert-close"
            onClick={onDismiss}
            className="ml-4 text-white text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};