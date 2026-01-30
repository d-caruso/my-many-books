import React from 'react';
import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import type { MobileAnalyticsStatsResponse } from '../../../../../services/api';

export interface PerformanceMetricsProps {
  stats: MobileAnalyticsStatsResponse | null;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ stats }) => {
  const lastProcessed = stats?.lastProcessed ? new Date(stats.lastProcessed).toLocaleString() : '—';
  const generatedAt = stats?.generatedAt ? new Date(stats.generatedAt).toLocaleString() : '—';

  const timeSeries = stats?.timeSeries ?? [];
  const totalsLast24h = timeSeries.reduce(
    (acc, point) => {
      acc.total += point.total;
      acc.processed += point.processed;
      acc.failed += point.failed;
      return acc;
    },
    { total: 0, processed: 0, failed: 0 }
  );

  const peakHour = timeSeries.reduce<{ bucketStart: string; total: number } | null>((peak, point) => {
    if (!peak) return { bucketStart: point.bucketStart, total: point.total };
    return point.total > peak.total ? { bucketStart: point.bucketStart, total: point.total } : peak;
  }, null);

  const avgPerHour = timeSeries.length ? Math.round(totalsLast24h.total / timeSeries.length) : 0;
  const peakHourLabel = peakHour?.bucketStart
    ? new Date(peakHour.bucketStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Performance</Typography>

        <Box display="flex" gap={3} flexWrap="wrap" sx={{ mt: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Avg processing time
            </Typography>
            <Typography variant="h6">{stats?.avgProcessingTimeMs ?? 0}ms</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Avg events / hour (24h)
            </Typography>
            <Typography variant="h6">{avgPerHour}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Peak hour volume (24h)
            </Typography>
            <Typography variant="h6">
              {peakHour ? `${peakHour.total} @ ${peakHourLabel}` : '—'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Last processed
            </Typography>
            <Typography variant="h6">{lastProcessed}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box display="flex" gap={3} flexWrap="wrap">
          <Box>
            <Typography variant="body2" color="text.secondary">
              Last 24h totals
            </Typography>
            <Typography variant="body2">
              Total {totalsLast24h.total} (ok {totalsLast24h.processed}, fail {totalsLast24h.failed})
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Stats generated at
            </Typography>
            <Typography variant="body2">{generatedAt}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" color="text.secondary">
          These metrics are based on the mobile analytics pipeline statistics endpoint.
        </Typography>
      </CardContent>
    </Card>
  );
};
