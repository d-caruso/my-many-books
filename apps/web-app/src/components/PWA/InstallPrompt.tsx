import React from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  IconButton,
} from '@mui/material';
import InstallIcon from '@mui/icons-material/GetApp';
import CloseIcon from '@mui/icons-material/Close';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '@my-many-books/shared-auth';
import { usePWAContext } from '../../contexts/PWAContext';
import { useLanguageChangeFade } from '../../hooks/useLanguageChangeFade';

const INSTALL_PROMPT_DISMISSED_KEY = 'pwa-install-prompt-dismissed';

export const InstallPrompt: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isInstallable, isInstalled, installApp } = usePWAContext();
  const [canInstall, setCanInstall] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const promptRef = React.useRef<HTMLDivElement | null>(null);
  const [dismissed, setDismissed] = React.useState(() => {
    try {
      return window.sessionStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const fadeSx = useLanguageChangeFade(promptRef, { keyframePrefix: 'pwaLangFade' });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setCanInstall(true);
      setVisible(true);
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (isInstallable) return;

    try {
      window.sessionStorage.removeItem(INSTALL_PROMPT_DISMISSED_KEY);
    } catch {
      // ignore storage failures for non-critical UI state
    }
    setDismissed(false);
  }, [isInstallable]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, '1');
    } catch {
      // ignore storage failures for non-critical UI state
    }
  };

  if (!user || isInstalled || !isInstallable || dismissed) {
    return null;
  }

  return (
    <Paper
      ref={promptRef}
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 1300,
        bgcolor: 'background.paper',
        color: 'text.primary',
        border: 1,
        borderColor: 'primary.main',
        boxSizing: 'border-box',
        p: 2,
        pr: 6,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        ...fadeSx,
        '@media (min-width: 768px)': {
          left: 'auto',
          width: 300,
          maxWidth: 300
        }
      }}
    >
      <IconButton
        size="small"
        onClick={handleDismiss}
        aria-label={t('common:close', { defaultValue: 'Close' })}
        sx={{
          color: 'inherit',
          position: 'absolute',
          top: 8,
          right: 8,
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      <Box display="flex" flexDirection="column" gap={1.25}>
        <Box>
          <Typography variant="subtitle2" fontWeight="700" color="primary.main">
            {t('pwa:install_prompt.title')}
          </Typography>
          <Typography
            variant="body2"
            color="text.primary"
            component="div"
            sx={{ mt: 0.5, lineHeight: 1.4 }}
          >
            <Trans
              i18nKey="pwa:install_prompt.message"
              components={{
                bold: <Box key="install-prompt-bold" component="span" sx={{ fontWeight: 700, color: 'inherit' }} />,
              }}
            />
          </Typography>
        </Box>

        <Box display="flex" justifyContent="flex-start">
          <Button
            onClick={installApp}
            variant="contained"
            size="small"
            startIcon={<InstallIcon />}
            disabled={!canInstall}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.dark'
              }
            }}
          >
            {t('pwa:install_prompt.install_button')}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};
