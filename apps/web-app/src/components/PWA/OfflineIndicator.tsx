import React from 'react';
import { useTranslation } from 'react-i18next';
import { Snackbar, Alert, AlertTitle, Button as MuiButton } from '@mui/material';
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
      <Snackbar
        open
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        data-testid="snackbar"
      >
        <Alert
          severity="warning"
          action={
            <>
              {showRetry && (
                <MuiButton color="inherit" size="small" data-testid="alert-action" onClick={onRetry}>
                  {t('pwa:offline_indicator.retry')}
                </MuiButton>
              )}
              {dismissible && (
                <MuiButton color="inherit" size="small" data-testid="alert-close" onClick={onDismiss}>
                  {t('common:close')}
                </MuiButton>
              )}
            </>
          }
        >
          <AlertTitle>{t('pwa:offline_indicator.you_are_offline')}</AlertTitle>
          {displayMessage}
        </Alert>
      </Snackbar>
    );
  }

  return (
    <Alert
      severity="warning"
      data-testid="alert-warning"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1300,
        borderRadius: 0,
      }}
      action={
        <>
          {showRetry && (
            <MuiButton color="inherit" size="small" data-testid="alert-action" onClick={onRetry}>
              {t('pwa:offline_indicator.retry')}
            </MuiButton>
          )}
          {dismissible && (
            <MuiButton color="inherit" size="small" data-testid="alert-close" onClick={onDismiss}>
              {t('common:close')}
            </MuiButton>
          )}
        </>
      }
    >
      <AlertTitle>{t('pwa:offline_indicator.you_are_offline')}</AlertTitle>
      {displayMessage} {t('pwa:offline_indicator.features_limited')}
    </Alert>
  );
};
