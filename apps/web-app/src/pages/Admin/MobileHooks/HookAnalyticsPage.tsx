import { extractErrorMessage } from '@my-many-books/shared-utils';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../AdminLayout';
import { useApi } from '../../../contexts/ApiContext';
import type { MobileAnalyticsActionTypeBreakdown } from '@my-many-books/shared-types';
import { ActionExecutionStats } from './components/analytics/ActionExecutionStats';

const STATS_POLL_INTERVAL_MS = 10_000;

export const HookAnalyticsPage: React.FC = () => {
  const { apiService } = useApi();
  const { t } = useTranslation('pages');

  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionStats, setActionStats] = useState<{ actionTypeBreakdown: MobileAnalyticsActionTypeBreakdown[] } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const loadStats = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const payload = await apiService.getHookActionStats(controller.signal);
      if (controller.signal.aborted) return;
      setActionStats(payload);
      setError(null);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(t('admin.mobile_hooks.errors.analytics.load'));
    }
  }, [apiService, t]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadStats();
      } finally {
        setLoading(false);
      }
    };

    void run();
    return () => {
      abortRef.current?.abort();
    };
  }, [loadStats]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (loading || reloading) return;
      void loadStats();
    }, STATS_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadStats, loading, reloading]);

  const handleReload = async () => {
    try {
      setReloading(true);
      await loadStats();
    } finally {
      setReloading(false);
    }
  };

  return (
    <AdminLayout>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h4">{t('admin.mobile_hooks.pages.analytics.title')}</Typography>
          <Button
            variant="outlined"
            startIcon={reloading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => void handleReload()}
            disabled={reloading || loading}
          >
            {t('admin.mobile_hooks.actions.refresh')}
          </Button>
        </Box>

        {error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        ) : (
          <ActionExecutionStats actionTypeBreakdown={actionStats?.actionTypeBreakdown ?? []} />
        )}
      </Box>
    </AdminLayout>
  );
};

export default HookAnalyticsPage;
