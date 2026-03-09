import { extractErrorMessage } from '@my-many-books/shared-utils';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type {
  AdminMobileHooksEmergencyStatusResponse,
  AdminMobileHooksEmergencyStatusUpdateRequest,
} from '../../../../../services/api';

export interface EmergencyControlsPanelProps {
  emergency: AdminMobileHooksEmergencyStatusResponse | null;
  onUpdate: (request: AdminMobileHooksEmergencyStatusUpdateRequest) => Promise<void>;
}

export const EmergencyControlsPanel: React.FC<EmergencyControlsPanelProps> = ({
  emergency,
  onUpdate,
}) => {
  const { t } = useTranslation('pages');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEnabled = emergency?.enabled ?? true;
  const disabledAtLabel = useMemo(() => {
    if (!emergency?.disabledAt) return null;
    try {
      return new Date(emergency.disabledAt).toLocaleString();
    } catch {
      return emergency.disabledAt;
    }
  }, [emergency?.disabledAt]);

  useEffect(() => {
    setError(null);
    setReason('');
  }, [isEnabled]);

  const disableHooks = async () => {
    setSaving(true);
    setError(null);
    try {
      await onUpdate({ enabled: false, reason: reason || undefined });
    } catch (err: unknown) {
      setError(t('admin.mobile_hooks.errors.emergency.disable'));
    } finally {
      setSaving(false);
    }
  };

  const enableHooks = async () => {
    setSaving(true);
    setError(null);
    try {
      await onUpdate({ enabled: true });
    } catch (err: unknown) {
      setError(t('admin.mobile_hooks.errors.emergency.enable'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">{t('admin.mobile_hooks.dashboard.emergency.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {t('admin.mobile_hooks.dashboard.emergency.description')}
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {t('admin.mobile_hooks.dashboard.labels.mobile_hooks_enabled')}
        </Typography>
        <Typography variant="h6">{isEnabled ? t('admin.mobile_hooks.common.yes') : t('admin.mobile_hooks.common.no')}</Typography>
      </Box>

      {isEnabled ? (
        <Box sx={{ mt: 2 }} display="flex" flexDirection="column" gap={2}>
          <TextField
            label={t('admin.mobile_hooks.dashboard.emergency.reason_label')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('admin.mobile_hooks.dashboard.emergency.reason_placeholder')}
            disabled={saving}
            multiline
            minRows={2}
          />
          <Box>
            <Button
              variant="contained"
              color="error"
              onClick={() => void disableHooks()}
              disabled={saving}
            >
              {t('admin.mobile_hooks.dashboard.emergency.disable_button')}
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ mt: 2 }} display="flex" flexDirection="column" gap={1}>
          <Typography variant="body2" color="text.secondary">
            {t('admin.mobile_hooks.dashboard.emergency.disabled_at', { value: disabledAtLabel ?? '—' })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('admin.mobile_hooks.dashboard.emergency.disabled_reason', { value: emergency?.disabledReason ?? '—' })}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Button
              variant="contained"
              color="success"
              onClick={() => void enableHooks()}
              disabled={saving}
            >
              {t('admin.mobile_hooks.dashboard.emergency.enable_button')}
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};
