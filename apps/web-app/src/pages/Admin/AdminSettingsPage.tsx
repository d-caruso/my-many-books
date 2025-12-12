import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from './AdminLayout';
import { apiService, type AuditLoggingStatus } from '../../services/api';

export const AdminSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuditLoggingStatus | null>(null);

  // Fetch audit logging status
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getAuditLoggingStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch audit logging status');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!status || !status.canChange) return;

    try {
      setUpdating(true);
      setError(null);
      const data = await apiService.updateAuditLoggingStatus(!status.enabled);
      setStatus(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update audit logging status');
    } finally {
      setUpdating(false);
    }
  };

  const getSourceBadge = (source: string) => {
    const badges = {
      force_disabled: { label: 'Disabled by deployment', color: 'error' as const },
      force_enabled: { label: 'Enforced by deployment', color: 'success' as const },
      database: { label: 'Controlled via admin panel', color: 'primary' as const },
      default: { label: 'Default setting', color: 'default' as const },
    };
    const badge = badges[source as keyof typeof badges] || badges.default;
    return <Chip label={badge.label} color={badge.color} size="small" sx={{ ml: 2 }} />;
  };

  const getHelpText = (source: string, canChange: boolean) => {
    if (source === 'force_disabled') {
      return 'Audit logging is permanently disabled by infrastructure configuration (AUDIT_LOGGING_FORCE_DISABLED=true). Contact your system administrator to enable it.';
    }
    if (source === 'force_enabled') {
      return 'Audit logging is permanently enabled by infrastructure configuration (AUDIT_LOGGING_FORCE_ENABLED=true) for compliance requirements. It cannot be disabled via this panel.';
    }
    if (canChange) {
      return 'Toggle audit logging on or off. This setting is stored in the database and takes effect immediately (with 30-second cache). All admin actions (create, update, delete) will be logged when enabled.';
    }
    return 'Audit logging configuration.';
  };

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          {t('pages:admin.settings.page_title', 'Settings')}
        </Typography>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Audit Logging
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : status ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={status.enabled}
                      onChange={handleToggle}
                      disabled={!status.canChange || updating}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography>
                        {status.enabled ? 'Enabled' : 'Disabled'}
                        {updating && (
                          <CircularProgress size={16} sx={{ ml: 1, verticalAlign: 'middle' }} />
                        )}
                      </Typography>
                      {getSourceBadge(status.source)}
                    </Box>
                  }
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                {getHelpText(status.source, status.canChange)}
              </Typography>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="caption" component="div" gutterBottom>
                  <strong>What gets logged:</strong>
                </Typography>
                <Typography variant="caption" component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>User ID and role at time of action</li>
                  <li>Action type (create, update, delete)</li>
                  <li>Resource type and ID</li>
                  <li>IP address and user agent</li>
                  <li>Timestamp and details</li>
                </Typography>
              </Box>
            </>
          ) : null}
        </Paper>
      </Box>
    </AdminLayout>
  );
};

export default AdminSettingsPage;
