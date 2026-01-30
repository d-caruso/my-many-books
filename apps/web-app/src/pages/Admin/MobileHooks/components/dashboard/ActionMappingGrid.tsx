import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type {
  AdminMobileHooksActionMappings,
  AdminMobileHooksActionTypesResponse,
  AdminMobileHooksActionsConfigMappingsResponse,
} from '../../../../../services/api';

export interface ActionMappingGridProps {
  config: AdminMobileHooksActionsConfigMappingsResponse;
  actionTypes: AdminMobileHooksActionTypesResponse;
  disabled?: boolean;
  onUpdateMappings: (actions: AdminMobileHooksActionMappings) => Promise<void>;
}

export const ActionMappingGrid: React.FC<ActionMappingGridProps> = ({
  config,
  actionTypes,
  disabled = false,
  onUpdateMappings,
}) => {
  const { t } = useTranslation('pages');
  const columns = useMemo(() => Object.keys(actionTypes.actions).sort(), [actionTypes.actions]);
  const events = useMemo(() => config.availableEvents.slice().sort(), [config.availableEvents]);

  const [actions, setActions] = useState<AdminMobileHooksActionMappings>(config.actions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActions(config.actions);
  }, [config.actions]);

  const toggleMapping = async (eventName: string, actionType: string) => {
    const current = actions[eventName] ?? [];
    const next = current.includes(actionType)
      ? current.filter(a => a !== actionType)
      : [...current, actionType].sort();

    const nextActions: AdminMobileHooksActionMappings = {
      ...actions,
      [eventName]: next,
    };

    setActions(nextActions);
    setSaving(true);
    setError(null);

    try {
      await onUpdateMappings(nextActions);
    } catch (err: any) {
      setError(t('admin.mobile_hooks.errors.mappings.save'));
      setActions(actions);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
        <Typography variant="h6">Hook → action mappings</Typography>
        {saving ? <CircularProgress size={18} /> : null}
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ overflowX: 'auto', mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Event</TableCell>
              {columns.map((actionType) => (
                <TableCell key={actionType} align="center">
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {actionType}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((eventName) => (
              <TableRow key={eventName} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>{eventName}</TableCell>
                {columns.map((actionType) => {
                  const checked = (actions[eventName] ?? []).includes(actionType);
                  return (
                    <TableCell key={`${eventName}:${actionType}`} align="center">
                      <Checkbox
                        size="small"
                        checked={checked}
                        disabled={disabled || saving}
                        onChange={() => void toggleMapping(eventName, actionType)}
                        inputProps={{ 'aria-label': `${eventName} → ${actionType}` }}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};
