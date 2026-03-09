import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../../../../contexts/ApiContext';
import type { AdminMobileHooksActionTypesResponse } from '../../../../../services/api';

export const ActionSettingsForm: React.FC = () => {
  const { apiService } = useApi();
  const { t } = useTranslation('pages');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [actionTypes, setActionTypes] = useState<AdminMobileHooksActionTypesResponse | null>(null);
  const [selectedActionType, setSelectedActionType] = useState<string>('');
  const [settingsJson, setSettingsJson] = useState<string>('{}');
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const payload = await apiService.getAdminMobileHooksActionTypes();
        setActionTypes(payload);

        const first = Object.keys(payload.actions)[0] ?? '';
        setSelectedActionType(first);
      } catch {
        setError(t('admin.mobile_hooks.errors.action_types.load'));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [apiService, t]);

  const selected = useMemo(() => {
    if (!actionTypes || !selectedActionType) return null;
    return actionTypes.actions[selectedActionType] ?? null;
  }, [actionTypes, selectedActionType]);

  useEffect(() => {
    if (!selected) return;
    const settings = selected.settings ?? {};
    setEnabled(Boolean((settings as Record<string, unknown>)['enabled'] ?? selected.enabled));
    setSettingsJson(JSON.stringify(settings, null, 2));
    setSuccess(null);
    setError(null);
  }, [selected]);

  const parsedSettings = useMemo(() => {
    try {
      const parsed = JSON.parse(settingsJson || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false as const, error: t('admin.mobile_hooks.errors.validation.json_object') };
      }
      return { ok: true as const, value: parsed as Record<string, unknown> };
    } catch {
      return { ok: false as const, error: t('admin.mobile_hooks.errors.validation.invalid_json') };
    }
  }, [settingsJson, t]);

  const save = async () => {
    if (!actionTypes || !selectedActionType) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!parsedSettings.ok) {
        setError(parsedSettings.error);
        return;
      }

      const payload: Record<string, unknown> = {
        ...parsedSettings.value,
        enabled,
      };

      const result = await apiService.updateAdminMobileHooksActionTypeSettings(selectedActionType, payload);

      setSuccess(t('admin.mobile_hooks.success.action_settings_updated', { actionType: result.actionType }));
      // refresh local cached actionTypes
      const refreshed = await apiService.getAdminMobileHooksActionTypes();
      setActionTypes(refreshed);
    } catch {
      setError(t('admin.mobile_hooks.errors.action_settings.save'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={18} />
          <Typography variant="body2">{t('admin.mobile_hooks.configuration.action_settings.loading_action_types')}</Typography>
        </Box>
      </Paper>
    );
  }

  if (!actionTypes) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="error">{t('admin.mobile_hooks.errors.action_types.load')}</Alert>
      </Paper>
    );
  }

  const actionTypeOptions = Object.keys(actionTypes.actions).sort();

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h6">{t('admin.mobile_hooks.configuration.action_settings.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('admin.mobile_hooks.configuration.action_settings.description')}
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => void save()} disabled={saving || !selectedActionType}>
          {saving ? <CircularProgress size={16} /> : t('admin.mobile_hooks.actions.save')}
        </Button>
      </Box>

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

      <Box sx={{ mt: 2 }} display="flex" gap={2} flexWrap="wrap" alignItems="center">
        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel id="action-type-label">{t('admin.mobile_hooks.columns.action_type')}</InputLabel>
          <Select
            labelId="action-type-label"
            value={selectedActionType}
            label={t('admin.mobile_hooks.columns.action_type')}
            onChange={(e) => setSelectedActionType(e.target.value)}
          >
            {actionTypeOptions.map((actionType) => (
              <MenuItem key={actionType} value={actionType}>
                {actionType}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2">{t('admin.mobile_hooks.columns.enabled')}</Typography>
          <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        </Box>
      </Box>

      {selected ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {selected.description}
          </Typography>

          {selected.warnings?.length ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {selected.warnings.join(' ')}
            </Alert>
          ) : null}
        </Box>
      ) : null}

      <Box sx={{ mt: 2 }}>
        <TextField
          label={t('admin.mobile_hooks.configuration.action_settings.settings_json')}
          value={settingsJson}
          onChange={(e) => setSettingsJson(e.target.value)}
          fullWidth
          multiline
          minRows={8}
          error={!parsedSettings.ok}
          helperText={
            !parsedSettings.ok ? parsedSettings.error : t('admin.mobile_hooks.configuration.action_settings.settings_helper')
          }
          inputProps={{ style: { fontFamily: 'monospace' } }}
        />
      </Box>
    </Paper>
  );
};
