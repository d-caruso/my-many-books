import React from 'react';
import { Box, Typography, Button, Alert, Stack, Paper } from '@mui/material';
import { Refresh as RefreshIcon, Lock as LockIcon, Login as LoginIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface AuthErrorFallbackProps {
  error: Error;
  reset: () => void;
}

export const AuthErrorFallback: React.FC<AuthErrorFallbackProps> = ({
  error,
  reset
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    navigate('/auth');
  };

  return (
    <Box
      data-testid="auth-error-fallback"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 3
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600 }}>
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
            <LockIcon sx={{ fontSize: 40 }} />
          </Box>

          <Box textAlign="center">
            <Typography variant="h5" fontWeight="600" gutterBottom>
              {t('auth:error_title')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('auth:error_message')}
            </Typography>
          </Box>

          <Alert severity="error" sx={{ width: '100%' }}>
            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
              {error.message}
            </Typography>
          </Alert>

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={reset}
              data-testid="retry-auth"
            >
              {t('common:retry')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<LoginIcon />}
              onClick={handleLoginRedirect}
              data-testid="go-login"
            >
              {t('auth:go_to_login')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};
