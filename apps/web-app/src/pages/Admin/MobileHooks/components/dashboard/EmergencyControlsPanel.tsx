import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
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
    } catch (err: any) {
      setError(err?.message || 'Failed to disable mobile hooks');
    } finally {
      setSaving(false);
    }
  };

  const enableHooks = async () => {
    setSaving(true);
    setError(null);
    try {
      await onUpdate({ enabled: true });
    } catch (err: any) {
      setError(err?.message || 'Failed to enable mobile hooks');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Emergency controls</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Toggle mobile hooks globally. Disabling will stop hook processing (emergency kill switch).
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Mobile hooks enabled
        </Typography>
        <Typography variant="h6">{isEnabled ? 'Yes' : 'No'}</Typography>
      </Box>

      {isEnabled ? (
        <Box sx={{ mt: 2 }} display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you disabling mobile hooks?"
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
              Disable mobile hooks
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ mt: 2 }} display="flex" flexDirection="column" gap={1}>
          <Typography variant="body2" color="text.secondary">
            Disabled at: {disabledAtLabel ?? '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Reason: {emergency?.disabledReason ?? '—'}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Button
              variant="contained"
              color="success"
              onClick={() => void enableHooks()}
              disabled={saving}
            >
              Enable mobile hooks
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};
