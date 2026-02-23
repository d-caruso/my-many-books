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
import { usePWAContext } from '../../contexts/PWAContext';
import { LANGUAGE_FADE_IN_TIMING, LANGUAGE_FADE_OUT_TIMING } from '../../constants/animations';

const INSTALL_PROMPT_DISMISSED_KEY = 'pwa-install-prompt-dismissed';

export const InstallPrompt: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isInstallable, isInstalled, installApp } = usePWAContext();
  const [canInstall, setCanInstall] = React.useState(false);
  const promptRef = React.useRef<HTMLDivElement | null>(null);
  const [dismissed, setDismissed] = React.useState(() => {
    try {
      return window.sessionStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Check if the deferred prompt is available by testing installApp
  React.useEffect(() => {
    // The installApp function will log a warning if deferredPrompt is null
    // We'll consider it available after a short delay to allow the event to fire
    const timer = setTimeout(() => {
      setCanInstall(true);
    }, 1000);

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

  React.useEffect(() => {
    const handleFadeOut = () => {
      if (!promptRef.current) return;
      promptRef.current.style.animation = `pwaLangFadeOut ${LANGUAGE_FADE_OUT_TIMING}`;
    };

    const handleFadeIn = () => {
      if (!promptRef.current) return;
      promptRef.current.style.animation = `pwaLangFadeIn ${LANGUAGE_FADE_IN_TIMING}`;
    };

    document.addEventListener('languageChanging', handleFadeOut);
    i18n.on('languageChanged', handleFadeIn);

    return () => {
      document.removeEventListener('languageChanging', handleFadeOut);
      i18n.off('languageChanged', handleFadeIn);
    };
  }, [i18n]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, '1');
    } catch {
      // ignore storage failures for non-critical UI state
    }
  };

  if (isInstalled || !isInstallable || dismissed) {
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
        p: 2,
        pr: 6,
        '@keyframes pwaLangFadeOut': {
          '0%': { opacity: 1 },
          '100%': { opacity: 0 },
        },
        '@keyframes pwaLangFadeIn': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        '@media (min-width: 768px)': {
          left: 'auto',
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
