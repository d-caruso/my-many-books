import { extractErrorMessage } from '@my-many-books/shared-utils';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../AdminLayout';
import { useApi } from '../../../contexts/ApiContext';
import type { MobileAnalyticsStatsResponse } from '../../../services/api';
import { EventVolumeChart } from '../MobileHooks/components/analytics/EventVolumeChart';
import { ErrorRateMonitor } from '../MobileHooks/components/analytics/ErrorRateMonitor';
import { PerformanceMetrics } from '../MobileHooks/components/analytics/PerformanceMetrics';

const STATS_POLL_INTERVAL_MS = 10_000;

export const MobileAnalyticsPage: React.FC = () => {
  const { apiService } = useApi();
  const { t } = useTranslation('pages');

  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MobileAnalyticsStatsResponse | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const loadStats = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const payload = await apiService.getMobileAnalyticsStats(controller.signal);
      if (controller.signal.aborted) return;
      setStats(payload);
      setError(null);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(t('admin.mobile_analytics.errors.load', 'Failed to load analytics'));
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
          <Typography variant="h4">Mobile Analytics</Typography>
          <Button
            variant="outlined"
            startIcon={reloading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => void handleReload()}
            disabled={reloading || loading}
          >
            Refresh
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
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <EventVolumeChart stats={stats} />
            </Grid>
            <Grid item xs={12} md={6}>
              <PerformanceMetrics stats={stats} />
            </Grid>
            <Grid item xs={12}>
              <ErrorRateMonitor stats={stats} />
            </Grid>
          </Grid>
        )}
      </Box>
    </AdminLayout>
  );
};

export default MobileAnalyticsPage;
