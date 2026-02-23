import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useTranslation } from 'react-i18next';

interface Props {
  error: Error;
  reset: () => void;
}

export const RootErrorFallback: React.FC<Props> = ({ error, reset }) => {
  const { t } = useTranslation();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          gap: 3,
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 80, color: 'error.main' }} />

        <Typography variant="h4" component="h1" gutterBottom>
          {t('common:page_error_title')}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {t('common:page_error_message')}
        </Typography>

        {process.env.NODE_ENV === 'development' && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'grey.100',
              borderRadius: 1,
              width: '100%',
              textAlign: 'left',
            }}
          >
            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {error.message}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={reset}
            size="large"
          >
            {t('common:retry', 'Try Again')}
          </Button>

          <Button
            variant="outlined"
            onClick={() => window.location.href = '/'}
            size="large"
          >
            {t('common:go_home', 'Go to Home')}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};
