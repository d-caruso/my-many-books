import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Button, Container, Typography } from '@mui/material';
import { Trans, useTranslation } from 'react-i18next';
import { LoginForm, RegisterForm } from '../components/Auth';
import { LanguageSelector } from '../components/Navigation/LanguageSelector';
import { AboutDialog } from '../components/About/AboutDialog';
import { useAuth } from '@my-many-books/shared-auth';
import { LANGUAGE_FADE_IN_TIMING, LANGUAGE_FADE_OUT_TIMING } from '../constants/animations';

type AuthMode = 'login' | 'register';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [aboutOpen, setAboutOpen] = useState(false);
  const { user } = useAuth();
  const { t, i18n } = useTranslation('common');
  const appName = t('app_name', 'My Many Books');
  const logoAlt = t('app_logo', 'My Many Books logo');
  const pageContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pageContentRef.current;
    if (!el) return;

    const handleFadeOut = () => {
      el.style.animation = 'none';
      void el.offsetHeight;
      el.style.animation = `langFadeOut ${LANGUAGE_FADE_OUT_TIMING}`;
    };

    const handleFadeIn = () => {
      el.style.animation = 'none';
      void el.offsetHeight;
      el.style.animation = `langFadeIn ${LANGUAGE_FADE_IN_TIMING}`;
      el.addEventListener('animationend', () => {
        el.style.animation = '';
      }, { once: true });
    };

    document.addEventListener('languageChanging', handleFadeOut);
    i18n.on('languageChanged', handleFadeIn);

    return () => {
      document.removeEventListener('languageChanging', handleFadeOut);
      i18n.off('languageChanged', handleFadeIn);
    };
  }, [i18n]);

  // If user is already authenticated, redirect to home
  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        component="header"
        sx={{
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          px: { xs: 1.5, sm: 2 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <LanguageSelector />
        </Box>
      </Box>

      <Box
        ref={pageContentRef}
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 6, md: 10 },
          px: 2,
          '@keyframes langFadeOut': {
            '0%': { opacity: 1 },
            '100%': { opacity: 0 },
          },
          '@keyframes langFadeIn': {
            '0%': { opacity: 0 },
            '100%': { opacity: 1 },
          },
        }}
      >
        <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 3
          }}
        >
          <Box
            component="img"
            src="/brand/logo-mark-primary-128.png"
            alt={logoAlt}
            sx={{
              width: 140,
              height: 140,
              mb: 1.5
            }}
          />
          <Typography variant="h6" component="p" color="text.primary" fontWeight={700}>
            {appName}
          </Typography>
        </Box>
        {mode === 'login' ? (
          <LoginForm onSwitchToRegister={() => setMode('register')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setMode('login')} />
        )}
        <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'center' }}>
          <Button
            type="button"
            variant="text"
            size="small"
            onClick={() => setAboutOpen(true)}
            sx={{
              textTransform: 'none',
              fontSize: { xs: '0.95rem', sm: '1rem' },
              fontWeight: 500,
            }}
          >
            <Trans
              ns="common"
              i18nKey="about_app_link"
              values={{ appName }}
              components={{
                bold: <Box key="auth-about-link-bold" component="span" sx={{ fontWeight: 700 }} />,
              }}
            />
          </Button>
        </Box>
        <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
        </Container>
      </Box>
    </Box>
  );
};
export default AuthPage;
