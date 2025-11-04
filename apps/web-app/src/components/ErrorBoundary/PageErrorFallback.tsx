import React from 'react';
import { Box, Typography, Button, Alert, Stack, Container } from '@mui/material';
import { Refresh as RefreshIcon, Home as HomeIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface PageErrorFallbackProps {
  error: Error;
  reset: () => void;
  pageName?: string;
}

export const PageErrorFallback: React.FC<PageErrorFallbackProps> = ({
  error,
  reset,
  pageName
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box
        data-testid="page-error-fallback"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          py: 8
        }}
      >
        <Stack spacing={3} sx={{ width: '100%', maxWidth: 600 }}>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight="600" gutterBottom>
              {t('common:page_error_title')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {pageName
                ? t('common:page_error_message_with_name', { page: pageName })
                : t('common:page_error_message')}
            </Typography>
          </Box>

          <Alert severity="error" sx={{ width: '100%' }}>
            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
              {error.message}
            </Typography>
          </Alert>

          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={reset}
              data-testid="retry-page"
            >
              {t('common:retry')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              data-testid="go-home-page"
            >
              {t('common:go_home')}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Container>
  );
};
