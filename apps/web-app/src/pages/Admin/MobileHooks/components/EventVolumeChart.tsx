import React from 'react';
import { Box, Card, CardContent, Divider, LinearProgress, Typography } from '@mui/material';
import type { MobileAnalyticsStatsResponse } from '../../../../services/api';

export interface EventVolumeChartProps {
  stats: MobileAnalyticsStatsResponse | null;
}

export const EventVolumeChart: React.FC<EventVolumeChartProps> = ({ stats }) => {
  const topEventTypes = stats?.topEventTypes ?? [];
  const maxCount = topEventTypes.reduce((max, item) => Math.max(max, item.count || 0), 0);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Event volume</Typography>

        <Box display="flex" gap={3} flexWrap="wrap" sx={{ mt: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Processed today
            </Typography>
            <Typography variant="h6">{stats?.eventsProcessedToday ?? 0}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Total processed
            </Typography>
            <Typography variant="h6">{stats?.eventsProcessedTotal ?? 0}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Top event types
        </Typography>

        {topEventTypes.length ? (
          <Box display="flex" flexDirection="column" gap={1.5}>
            {topEventTypes.map((item) => (
              <Box key={item.eventType}>
                <Box display="flex" justifyContent="space-between" gap={2}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {item.eventType}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.count}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={maxCount ? (item.count / maxCount) * 100 : 0}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No events processed yet.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

