import React from 'react';
import { Box, Typography, Button, Alert, Stack, Paper } from '@mui/material';
import { Refresh as RefreshIcon, AdminPanelSettings as AdminIcon, Home as HomeIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface AdminErrorFallbackProps {
  error: Error;
  reset: () => void;
}

export const AdminErrorFallback: React.FC<AdminErrorFallbackProps> = ({
  error,
  reset
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box
      data-testid="admin-error-fallback"
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
            <AdminIcon sx={{ fontSize: 40 }} />
          </Box>

          <Box textAlign="center">
            <Typography variant="h5" fontWeight="600" gutterBottom>
              {t('admin:error_title')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('admin:error_message')}
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
              data-testid="retry-admin"
            >
              {t('common:retry')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              data-testid="go-home"
            >
              {t('common:go_home')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};
