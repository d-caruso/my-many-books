import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { NativeLoading } from './NativeLoading';

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
    return <NativeLoading />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check admin access if required
  if (requireAdmin && user.role !== 'admin') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            padding: '16px',
            borderRadius: '4px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
          }}
        >
          <h2 style={{ margin: '0 0 8px 0', color: '#991b1b', fontSize: '1.25rem' }}>
            {t('pages:protected_route.admin_required_title', 'Access Denied')}
          </h2>
          <p style={{ margin: '0', color: '#7f1d1d', fontSize: '0.875rem' }}>
            {t('pages:protected_route.admin_required_message', 'You need administrator privileges to access this page.')}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};