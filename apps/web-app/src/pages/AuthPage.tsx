import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Container, Snackbar, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Trans, useTranslation } from 'react-i18next';
import { LoginForm, RegisterForm } from '../components/Auth';
import { LanguageSelector } from '../components/Navigation/LanguageSelector';
import { AboutDialog } from '../components/About/AboutDialog';
import { useAuth } from '@my-many-books/shared-auth';
import { buildUrl } from '@my-many-books/shared-navigation';
import { useLanguageChangeFade } from '../hooks/useLanguageChangeFade';
import type { VerifyEmailNavState } from '../types/authNavState';

type AuthMode = 'login' | 'register';

const oauthErrorKey: Record<string, string> = {
  invalid_state: 'oauth_error_invalid_state',
  missing_code_or_state: 'oauth_error_missing_code',
  invalid_pkce_verifier: 'oauth_error_pkce_failed',
  oauth_exchange_failed: 'oauth_error_exchange_failed',
};

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [aboutOpen, setAboutOpen] = useState(false);
  const [socialAuthError, setSocialAuthError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const authPath = buildUrl('auth');
  const homePath = buildUrl('home');
  const appName = t('app_name', 'My Many Books');
  const logoAlt = t('app_logo', 'My Many Books logo');
  const pageContentRef = useRef<HTMLDivElement>(null);
  const fadeSx = useLanguageChangeFade(pageContentRef, { keyframePrefix: 'authLangFade' });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleStatus = params.get('google');

    if (!googleStatus) {
      return;
    }

    let ignore = false;
    const handleGoogleCallback = async () => {
      if (googleStatus === 'success') {
        try {
          await refreshUser();
          if (!ignore) navigate(homePath, { replace: true });
          return;
        } catch {
          if (!ignore) setSocialAuthError(t('oauth_error_generic'));
        }
      } else if (!ignore) {
        const reason = params.get('reason') ?? '';
        const key = oauthErrorKey[reason] ?? 'oauth_error_generic';
        setSocialAuthError(t(key));
      }

      if (!ignore) navigate(authPath, { replace: true });
    };

    void handleGoogleCallback();
    return () => {
      ignore = true;
    };
  }, [location.search, navigate, refreshUser, t]);

  const verifyStateProcessed = useRef(false);

  useEffect(() => {
    const state = location.state as VerifyEmailNavState | null;
    if (state?.success === undefined || verifyStateProcessed.current) return;
    verifyStateProcessed.current = true;

    if (state.success) {
      setMode('login');
      setSnackbar({ open: true, message: t('verify_email_success'), severity: 'success' });
    } else {
      setMode('register');
      setSnackbar({ open: true, message: state.errorMessage || t('verify_email_failed'), severity: 'error' });
    }

    // Clear state to prevent re-showing on refresh
    navigate(authPath, { replace: true, state: {} });
  }, [location.state, navigate, t]);

  // If user is already authenticated, redirect to home
  if (user) {
    return <Navigate to={homePath} replace />;
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1.5, sm: 2 },
          pt: { xs: 0.5, sm: 1 },
          pb: { xs: 0.25, sm: 0.5 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box
          component="img"
          src="/brand/logo-mark-primary-128.png"
          alt={logoAlt}
          sx={{ width: 55, height: 55 }}
        />
        <Box sx={{ minWidth: 0 }}>
          <LanguageSelector />
        </Box>
      </Box>

      <Box
        ref={pageContentRef}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: { xs: 1, md: 4 },
          px: 2,
          ...fadeSx,
        }}
      >
        {/* Title — centered in the space above the sign-in card */}
        <Box sx={{ flex: 1, minHeight: 56, maxHeight: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <Typography variant="h6" component="p" color="primary.main" fontWeight={700} sx={{ fontSize: { md: '1.5rem' } }}>
            {appName}
          </Typography>
        </Box>

        <Container maxWidth="sm">
        {socialAuthError ? (
          <Box
            role="alert"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              py: 4,
              textAlign: 'center',
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 56, color: 'error.main' }} />
            <Typography variant="h6" color="error.main" fontWeight={600}>
              {socialAuthError}
            </Typography>
            <Button
              variant="contained"
              onClick={() => setSocialAuthError(null)}
            >
              {t('try_again')}
            </Button>
          </Box>
        ) : mode === 'login' ? (
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

        {/* Bottom spacer — mirrors title section to keep form centered */}
        <Box sx={{ flex: 1, maxHeight: 96 }} />
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
export default AuthPage;
