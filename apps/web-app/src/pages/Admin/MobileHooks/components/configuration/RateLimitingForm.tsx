import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../../../../contexts/ApiContext';
import type { AdminMobileHooksActionTypesResponse } from '../../../../../services/api';

type RateLimitDrafts = Record<string, number | null>;

const extractRateLimitMinutes = (settings: Record<string, unknown>): number | null => {
  const raw = settings['rate_limit_minutes'];
  return typeof raw === 'number' ? raw : null;
};

export const RateLimitingForm: React.FC = () => {
  const { apiService } = useApi();
  const { t } = useTranslation('pages');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [actionTypes, setActionTypes] = useState<AdminMobileHooksActionTypesResponse | null>(null);
  const [drafts, setDrafts] = useState<RateLimitDrafts>({});

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);

        const payload = await apiService.getAdminMobileHooksActionTypes();
        setActionTypes(payload);

        const nextDrafts: RateLimitDrafts = {};
        for (const [actionType, info] of Object.entries(payload.actions)) {
          nextDrafts[actionType] = extractRateLimitMinutes(info.settings ?? {});
        }
        setDrafts(nextDrafts);
      } catch {
        setError(t('admin.mobile_hooks.errors.rate_limits.load'));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [apiService, t]);

  const hasAnyEditable = useMemo(() => {
    if (!actionTypes) return false;
    return Object.values(actionTypes.actions).some(info => extractRateLimitMinutes(info.settings ?? {}) !== null);
  }, [actionTypes]);

  const save = async () => {
    if (!actionTypes) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updates: Array<Promise<unknown>> = [];

      for (const [actionType, info] of Object.entries(actionTypes.actions)) {
        const current = extractRateLimitMinutes(info.settings ?? {});
        const next = drafts[actionType];
        if (current === null || next === null || next === undefined) continue;
        if (current === next) continue;

        updates.push(apiService.updateAdminMobileHooksActionTypeSettings(actionType, { rate_limit_minutes: next }));
      }

      await Promise.all(updates);

      const refreshed = await apiService.getAdminMobileHooksActionTypes();
      setActionTypes(refreshed);

      const nextDrafts: RateLimitDrafts = {};
      for (const [actionType, info] of Object.entries(refreshed.actions)) {
        nextDrafts[actionType] = extractRateLimitMinutes(info.settings ?? {});
      }
      setDrafts(nextDrafts);

      setSuccess(
        updates.length
          ? t('admin.mobile_hooks.success.rate_limits_updated')
          : t('admin.mobile_hooks.success.no_changes_to_save')
      );
    } catch {
      setError(t('admin.mobile_hooks.errors.rate_limits.save'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={18} />
          <Typography variant="body2">{t('admin.mobile_hooks.configuration.rate_limiting.loading')}</Typography>
        </Box>
      </Paper>
    );
  }

  if (!actionTypes) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="error">{t('admin.mobile_hooks.errors.rate_limits.load')}</Alert>
      </Paper>
    );
  }

  const rows = Object.keys(actionTypes.actions).sort();

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h6">{t('admin.mobile_hooks.configuration.rate_limiting.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('admin.mobile_hooks.configuration.rate_limiting.description')}
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => void save()} disabled={saving || !hasAnyEditable}>
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

      {!hasAnyEditable ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t('admin.mobile_hooks.configuration.rate_limiting.no_action_types_expose')}
        </Alert>
      ) : null}

      <Box sx={{ overflowX: 'auto', mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('admin.mobile_hooks.columns.action_type')}</TableCell>
              <TableCell>{t('admin.mobile_hooks.columns.rate_limit_minutes')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((actionType) => {
              const info = actionTypes.actions[actionType];
              const current = extractRateLimitMinutes(info.settings ?? {});
              const editable = current !== null;
              return (
                <TableRow key={actionType} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{actionType}</TableCell>
                  <TableCell>
                    {editable ? (
                      <TextField
                        type="number"
                        size="small"
                        value={drafts[actionType] ?? current ?? 0}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [actionType]: Number(e.target.value),
                          }))
                        }
                        inputProps={{ min: 1, max: 1440 }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t('admin.mobile_hooks.common.na')}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};
