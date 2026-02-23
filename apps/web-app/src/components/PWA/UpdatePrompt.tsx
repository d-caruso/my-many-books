import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Snackbar,
  Alert,
  AlertTitle,
  LinearProgress,
  Stack
} from '@mui/material';
import { usePWAContext } from '../../contexts/PWAContext';

interface UpdatePromptProps {
  variant?: 'banner' | 'dialog' | 'snackbar';
  message?: string;
}

export const UpdatePrompt: React.FC<UpdatePromptProps> = ({
  variant = 'banner',
  message
}) => {
  const { t } = useTranslation();
  const { updateAvailable, updateApp, dismissUpdate } = usePWAContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!updateAvailable) {
    return null;
  }

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);
    try {
      await updateApp();
    } catch (err) {
      setError(t('pwa:update_prompt.update_failed'));
      setLoading(false);
    }
  };

  const defaultMessage = message || t('pwa:update_prompt.message');

  if (variant === 'dialog') {
    return (
      <Dialog open onClose={dismissUpdate} maxWidth="sm" fullWidth data-testid="dialog">
        <DialogTitle data-testid="dialog-title">{t('pwa:update_prompt.title')}</DialogTitle>
        <DialogContent data-testid="dialog-content">
          <Typography variant="body2" color="text.secondary">
            {defaultMessage}
          </Typography>
          {loading && (
            <Stack spacing={1} mt={2}>
              <LinearProgress data-testid="linear-progress" />
              <Typography variant="caption">{t('pwa:update_prompt.updating')}</Typography>
            </Stack>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }} data-testid="alert-error">
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions data-testid="dialog-actions">
          <Button onClick={dismissUpdate} disabled={loading}>
            {t('pwa:update_prompt.later_button')}
          </Button>
          <Button onClick={handleUpdate} disabled={loading} variant="contained">
            {loading ? t('pwa:update_prompt.updating') : t('pwa:update_prompt.update_button')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (variant === 'snackbar') {
    return (
      <Snackbar open anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} data-testid="snackbar">
        <Alert
          severity="info"
          action={
            <>
              <Button color="inherit" size="small" onClick={dismissUpdate}>
                {t('pwa:update_prompt.later_button')}
              </Button>
              <Button color="inherit" size="small" onClick={handleUpdate} disabled={loading}>
                {loading ? t('pwa:update_prompt.updating') : t('pwa:update_prompt.update_button')}
              </Button>
            </>
          }
        >
          <AlertTitle>{t('pwa:update_prompt.title')}</AlertTitle>
          {defaultMessage}
          {loading && <LinearProgress sx={{ mt: 1 }} data-testid="linear-progress" />}
          {error && (
            <Alert severity="error" sx={{ mt: 1 }} data-testid="alert-error">
              {error}
            </Alert>
          )}
        </Alert>
      </Snackbar>
    );
  }

  return (
    <Alert
      severity="info"
      data-testid="alert-info"
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        left: { xs: 16, sm: 'auto' },
        zIndex: 1300,
        boxSizing: 'border-box',
        width: { xs: 'auto', sm: 320 },
        maxWidth: 'calc(100vw - 32px)',
      }}
      action={
        <>
          <Button color="inherit" size="small" onClick={dismissUpdate}>
            {t('pwa:update_prompt.later_button')}
          </Button>
          <Button color="inherit" size="small" onClick={handleUpdate} disabled={loading}>
            {loading ? t('pwa:update_prompt.updating') : t('pwa:update_prompt.update_button')}
          </Button>
        </>
      }
    >
      <AlertTitle>{t('pwa:update_prompt.title')}</AlertTitle>
      {defaultMessage}
      {loading && <LinearProgress sx={{ mt: 1 }} data-testid="linear-progress" />}
      {error && (
        <Alert severity="error" sx={{ mt: 1 }} data-testid="alert-error">
          {t('pwa:update_prompt.update_failed')}
        </Alert>
      )}
    </Alert>
  );
};
