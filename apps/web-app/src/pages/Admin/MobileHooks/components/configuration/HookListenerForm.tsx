import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Switch,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../../../../contexts/ApiContext';
import type { MobileHooksListenerSettings } from '@my-many-books/shared-types';

type ListenerSettingsFormState = MobileHooksListenerSettings & {
  lastUpdated?: string | null;
  version?: string;
};

export const HookListenerForm: React.FC = () => {
  const { apiService } = useApi();
  const { t } = useTranslation('pages');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<ListenerSettingsFormState>({
    analyticsEnabled: true,
    errorReportingEnabled: true,
    performanceMonitoringEnabled: true,
    lastUpdated: null,
    version: undefined,
  });

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const payload = await apiService.getAdminMobileHooksListenerSettings();
        setForm({
          ...payload.settings,
          lastUpdated: payload.lastUpdated,
          version: payload.version,
        });
      } catch {
        setError(t('admin.mobile_hooks.errors.listener_settings.load'));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [apiService, t]);

  const save = async () => {
    setError(null);
    setSuccess(null);

    try {
      setSaving(true);
      const result = await apiService.updateAdminMobileHooksListenerSettings({
        analyticsEnabled: form.analyticsEnabled,
        errorReportingEnabled: form.errorReportingEnabled,
        performanceMonitoringEnabled: form.performanceMonitoringEnabled,
      });

      setForm(prev => ({
        ...prev,
        ...result.settings,
        lastUpdated: result.lastUpdated,
      }));
      setSuccess(t('admin.mobile_hooks.success.listener_settings_updated'));
    } catch {
      setError(t('admin.mobile_hooks.errors.listener_settings.save'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={18} />
          <Typography variant="body2">{t('admin.mobile_hooks.configuration.listener_settings.loading')}</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h6">{t('admin.mobile_hooks.configuration.listener_settings.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('admin.mobile_hooks.configuration.listener_settings.description')}
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => void save()} disabled={saving}>
          {saving ? <CircularProgress size={16} /> : t('admin.mobile_hooks.actions.save')}
        </Button>
      </Box>

      {form.version ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {t('admin.mobile_hooks.configuration.listener_settings.version', { version: form.version })}
        </Typography>
      ) : null}

      {form.lastUpdated ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {t('admin.mobile_hooks.configuration.listener_settings.last_updated', {
            timestamp: new Date(form.lastUpdated).toLocaleString(),
          })}
        </Typography>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}

      {success ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      ) : null}

      <Box sx={{ mt: 2 }} display="flex" flexDirection="column" gap={1}>
        <FormControlLabel
          control={
            <Switch
              checked={form.analyticsEnabled}
              onChange={(e) => setForm(prev => ({ ...prev, analyticsEnabled: e.target.checked }))}
            />
          }
          label={t('admin.mobile_hooks.configuration.listener_settings.analytics_enabled')}
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.errorReportingEnabled}
              onChange={(e) =>
                setForm(prev => ({ ...prev, errorReportingEnabled: e.target.checked }))
              }
            />
          }
          label={t('admin.mobile_hooks.configuration.listener_settings.error_reporting_enabled')}
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.performanceMonitoringEnabled}
              onChange={(e) =>
                setForm(prev => ({ ...prev, performanceMonitoringEnabled: e.target.checked }))
              }
            />
          }
          label={t('admin.mobile_hooks.configuration.listener_settings.performance_monitoring_enabled')}
        />
      </Box>
    </Paper>
  );
};
