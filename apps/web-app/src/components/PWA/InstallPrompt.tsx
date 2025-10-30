import React from 'react';
import {
  Paper,
  Typography,
  Button,
  Box
} from '@mui/material';
import {
  GetApp as InstallIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { usePWA } from '../../hooks/usePWA';

export const InstallPrompt: React.FC = () => {
  const { t } = useTranslation();
  const { isInstallable, isInstalled, installApp } = usePWA();

  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 1300,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        p: 2,
        '@media (min-width: 768px)': {
          left: 'auto',
          maxWidth: 320
        }
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box flex={1} pr={2}>
          <Box component="div" variant="subtitle2" fontWeight="600">
            {t('pwa:install_prompt.title')}
          </Box>
          <Typography variant="caption" color="black">
            {t('pwa:install_prompt.message')}
          </Typography>
        </Box>
        <Button
          onClick={installApp}
          variant="contained"
          size="small"
          startIcon={<InstallIcon />}
          sx={{
            bgcolor: 'background.paper',
            color: 'black',
            '&:hover': {
              bgcolor: 'grey.100'
            }
          }}
        >
          {t('pwa:install_prompt.install_button')}
        </Button>
      </Box>
    </Paper>
  );
};