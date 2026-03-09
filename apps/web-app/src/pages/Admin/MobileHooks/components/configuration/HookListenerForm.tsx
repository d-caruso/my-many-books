import { extractErrorMessage } from '@my-many-books/shared-utils';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
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
    offlineStorageEnabled: true,
    performanceMonitoringEnabled: true,
    batchUploadInterval: 300,
    maxOfflineEvents: 1000,
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
      } catch (err: unknown) {
        setError(t('admin.mobile_hooks.errors.listener_settings.load'));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [apiService, t]);

  const validationError = useMemo(() => {
    if (form.batchUploadInterval < 60 || form.batchUploadInterval > 3600) {
      return t('admin.mobile_hooks.errors.validation.batch_upload_interval_range', {
        min: 60,
        max: 3600,
      });
    }
    if (form.maxOfflineEvents < 100 || form.maxOfflineEvents > 10000) {
      return t('admin.mobile_hooks.errors.validation.max_offline_events_range', {
        min: 100,
        max: 10000,
      });
    }
    return null;
  }, [form.batchUploadInterval, form.maxOfflineEvents, t]);

  const save = async () => {
    setError(null);
    setSuccess(null);

    try {
      if (validationError) {
        setError(validationError);
        return;
      }

      setSaving(true);
      const result = await apiService.updateAdminMobileHooksListenerSettings({
        analyticsEnabled: form.analyticsEnabled,
        errorReportingEnabled: form.errorReportingEnabled,
        offlineStorageEnabled: form.offlineStorageEnabled,
        performanceMonitoringEnabled: form.performanceMonitoringEnabled,
        batchUploadInterval: form.batchUploadInterval,
        maxOfflineEvents: form.maxOfflineEvents,
      });

      setForm(prev => ({
        ...prev,
        ...result.settings,
        lastUpdated: result.lastUpdated,
      }));
      setSuccess(t('admin.mobile_hooks.success.listener_settings_updated'));
    } catch (err: unknown) {
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
        <Button variant="contained" onClick={() => void save()} disabled={saving || Boolean(validationError)}>
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

      {validationError ? (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {validationError}
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
              checked={form.offlineStorageEnabled}
              onChange={(e) =>
                setForm(prev => ({ ...prev, offlineStorageEnabled: e.target.checked }))
              }
            />
          }
          label={t('admin.mobile_hooks.configuration.listener_settings.offline_storage_enabled')}
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

      <Box sx={{ mt: 2 }} display="flex" gap={2} flexWrap="wrap">
        <TextField
          label={t('admin.mobile_hooks.configuration.listener_settings.batch_upload_interval_seconds')}
          type="number"
          value={form.batchUploadInterval}
          onChange={(e) =>
            setForm(prev => ({ ...prev, batchUploadInterval: Number(e.target.value) }))
          }
          inputProps={{ min: 60, max: 3600 }}
        />
        <TextField
          label={t('admin.mobile_hooks.configuration.listener_settings.max_offline_events')}
          type="number"
          value={form.maxOfflineEvents}
          onChange={(e) => setForm(prev => ({ ...prev, maxOfflineEvents: Number(e.target.value) }))}
          inputProps={{ min: 100, max: 10000 }}
        />
      </Box>
    </Paper>
  );
};
