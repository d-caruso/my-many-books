import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import { LoginForm, RegisterForm } from '../components/Auth';
import { useAuth } from '@my-many-books/shared-auth';

type AuthMode = 'login' | 'register';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const { user } = useAuth();

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
