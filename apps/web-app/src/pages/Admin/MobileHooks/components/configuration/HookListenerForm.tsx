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
import { useApi } from '../../../../../contexts/ApiContext';
import type { MobileHooksListenerSettings } from '@my-many-books/shared-types';

type ListenerSettingsFormState = MobileHooksListenerSettings & {
  lastUpdated?: string | null;
  version?: string;
};

export const HookListenerForm: React.FC = () => {
  const { apiService } = useApi();

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
      } catch (err: any) {
        setError(err?.message || 'Failed to load listener settings');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [apiService]);

  const validationError = useMemo(() => {
    if (form.batchUploadInterval < 60 || form.batchUploadInterval > 3600) {
      return 'Batch upload interval must be between 60 and 3600 seconds.';
    }
    if (form.maxOfflineEvents < 100 || form.maxOfflineEvents > 10000) {
      return 'Max offline events must be between 100 and 10000.';
    }
    return null;
  }, [form.batchUploadInterval, form.maxOfflineEvents]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (validationError) {
        throw new Error(validationError);
      }

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
      setSuccess('Listener settings updated.');
    } catch (err: any) {
      setError(err?.message || 'Failed to update listener settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={18} />
          <Typography variant="body2">Loading listener settings…</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h6">Listener settings</Typography>
          <Typography variant="body2" color="text.secondary">
            Feature flags and operational limits for mobile hook listeners.
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => void save()} disabled={saving || Boolean(validationError)}>
          {saving ? <CircularProgress size={16} /> : 'Save'}
        </Button>
      </Box>

      {form.version ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Version: {form.version}
        </Typography>
      ) : null}

      {form.lastUpdated ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Last updated: {new Date(form.lastUpdated).toLocaleString()}
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
          label="Analytics enabled"
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
          label="Error reporting enabled"
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
          label="Offline storage enabled"
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
          label="Performance monitoring enabled"
        />
      </Box>

      <Box sx={{ mt: 2 }} display="flex" gap={2} flexWrap="wrap">
        <TextField
          label="Batch upload interval (seconds)"
          type="number"
          value={form.batchUploadInterval}
          onChange={(e) =>
            setForm(prev => ({ ...prev, batchUploadInterval: Number(e.target.value) }))
          }
          inputProps={{ min: 60, max: 3600 }}
        />
        <TextField
          label="Max offline events"
          type="number"
          value={form.maxOfflineEvents}
          onChange={(e) => setForm(prev => ({ ...prev, maxOfflineEvents: Number(e.target.value) }))}
          inputProps={{ min: 100, max: 10000 }}
        />
      </Box>
    </Paper>
  );
};
