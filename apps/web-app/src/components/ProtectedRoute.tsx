import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false
}) => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        minHeight="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bgcolor="background.default"
      >
        <Box textAlign="center">
          <CircularProgress size={32} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            {t('pages:protected_route.loading')}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check admin access if required
  if (requireAdmin && user.role !== 'admin') {
    return (
      <Box
        minHeight="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bgcolor="background.default"
        p={3}
      >
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          <Typography variant="h6" gutterBottom>
            {t('pages:protected_route.admin_required_title', 'Access Denied')}
          </Typography>
          <Typography variant="body2">
            {t('pages:protected_route.admin_required_message', 'You need administrator privileges to access this page.')}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
};