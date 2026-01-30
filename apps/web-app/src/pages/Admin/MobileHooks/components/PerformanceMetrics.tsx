import React from 'react';
import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import type { MobileAnalyticsStatsResponse } from '../../../../services/api';

export interface PerformanceMetricsProps {
  stats: MobileAnalyticsStatsResponse | null;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ stats }) => {
  const lastProcessed = stats?.lastProcessed ? new Date(stats.lastProcessed).toLocaleString() : '—';

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
              Last processed
            </Typography>
            <Typography variant="h6">{lastProcessed}</Typography>
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

