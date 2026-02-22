import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Container, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { LoginForm, RegisterForm } from '../components/Auth';
import { useAuth } from '@my-many-books/shared-auth';

type AuthMode = 'login' | 'register';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const appName = t('app_name', 'My Many Books');
  const logoAlt = t('app_logo', 'My Many Books logo');

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
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 6, md: 10 },
        px: 2,
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
      </Container>
    </Box>
  );
};
export default AuthPage;
