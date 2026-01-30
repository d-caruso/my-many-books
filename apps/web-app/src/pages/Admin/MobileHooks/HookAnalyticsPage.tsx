import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AdminLayout } from '../AdminLayout';
import { useApi } from '../../../contexts/ApiContext';
import type { MobileAnalyticsStatsResponse } from '../../../services/api';
import { EventVolumeChart } from './components/EventVolumeChart';
import { ActionExecutionStats } from './components/ActionExecutionStats';
import { ErrorRateMonitor } from './components/ErrorRateMonitor';
import { PerformanceMetrics } from './components/PerformanceMetrics';

export const HookAnalyticsPage: React.FC = () => {
  const { apiService } = useApi();

  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MobileAnalyticsStatsResponse | null>(null);

  const loadStats = useCallback(async () => {
    setError(null);
    const payload = await apiService.getMobileAnalyticsStats();
    setStats(payload);
  }, [apiService]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadStats();
      } catch (err: any) {
        setError(err?.message || 'Failed to load mobile hook analytics');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [loadStats]);

  const handleReload = async () => {
    try {
      setReloading(true);
      await loadStats();
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh analytics');
    } finally {
      setReloading(false);
    }
  };

  return (
    <AdminLayout>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h4">Mobile Hooks Analytics</Typography>
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
              <ActionExecutionStats stats={stats} />
            </Grid>
            <Grid item xs={12} md={6}>
              <ErrorRateMonitor stats={stats} />
            </Grid>
            <Grid item xs={12} md={6}>
              <PerformanceMetrics stats={stats} />
            </Grid>
          </Grid>
        )}
      </Box>
    </AdminLayout>
  );
};

export default HookAnalyticsPage;

