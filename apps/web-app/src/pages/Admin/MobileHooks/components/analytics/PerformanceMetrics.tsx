import React from 'react';
import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MobileAnalyticsStatsResponse } from '../../../../../services/api';

export interface PerformanceMetricsProps {
  stats: MobileAnalyticsStatsResponse | null;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ stats }) => {
  const { t } = useTranslation('pages');
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
        <Typography variant="h6">{t('admin.mobile_hooks.analytics.performance.title')}</Typography>

        <Box display="flex" gap={3} flexWrap="wrap" sx={{ mt: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('admin.mobile_hooks.analytics.performance.avg_processing_time')}
            </Typography>
            <Typography variant="h6">
              {t('admin.mobile_hooks.analytics.performance.ms_suffix', { value: stats?.avgProcessingTimeMs ?? 0 })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('admin.mobile_hooks.analytics.performance.avg_events_per_hour_24h')}
            </Typography>
            <Typography variant="h6">{avgPerHour}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('admin.mobile_hooks.analytics.performance.peak_hour_volume_24h')}
            </Typography>
            <Typography variant="h6">
              {peakHour ? `${peakHour.total} @ ${peakHourLabel}` : '—'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('admin.mobile_hooks.analytics.performance.last_processed')}
            </Typography>
            <Typography variant="h6">{lastProcessed}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box display="flex" gap={3} flexWrap="wrap">
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('admin.mobile_hooks.analytics.performance.last_24h_totals')}
            </Typography>
            <Typography variant="body2">
              {t('admin.mobile_hooks.analytics.performance.totals_label', {
                total: totalsLast24h.total,
                processed: totalsLast24h.processed,
                failed: totalsLast24h.failed,
              })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('admin.mobile_hooks.analytics.performance.stats_generated_at')}
            </Typography>
            <Typography variant="body2">{generatedAt}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" color="text.secondary">
          {t('admin.mobile_hooks.analytics.performance.note')}
        </Typography>
      </CardContent>
    </Card>
  );
};
