import React from 'react';
import { Box, Typography, Button, Stack, Paper } from '@mui/material';
import { CameraAlt as CameraIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface ScannerErrorFallbackProps {
  error: Error;
  reset: () => void;
  onClose?: () => void;
}

export const ScannerErrorFallback: React.FC<ScannerErrorFallbackProps> = ({
  error,
  reset,
  onClose
}) => {
  const { t } = useTranslation();

  const getErrorMessage = (error: Error): string => {
    if (error.message.includes('Permission')) {
      return t('scanner:error_permission_denied');
    }
    if (error.message.includes('NotFoundError')) {
      return t('scanner:error_no_camera');
    }
    if (error.message.includes('NotReadableError')) {
      return t('scanner:error_camera_in_use');
    }
    return t('scanner:error_generic');
  };

  return (
    <Box
      data-testid="scanner-error-fallback"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        bgcolor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          maxWidth: 400,
          textAlign: 'center',
          bgcolor: 'rgba(255, 255, 255, 0.95)'
        }}
      >
        <Stack spacing={3} alignItems="center">
          <Box
            sx={{
              width: 80,
              height: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              bgcolor: 'error.light',
              color: 'error.contrastText'
            }}
          >
            <CameraIcon sx={{ fontSize: 40 }} />
          </Box>

          <Box>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              {t('scanner:error_title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getErrorMessage(error)}
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={reset}
              data-testid="retry-scanner"
            >
              {t('common:retry')}
            </Button>
            {onClose && (
              <Button
                variant="outlined"
                onClick={onClose}
                data-testid="close-scanner-error"
              >
                {t('common:close')}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};
