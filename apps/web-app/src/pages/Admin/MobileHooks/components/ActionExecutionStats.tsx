import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { MobileAnalyticsStatsResponse } from '../../../../services/api';

export interface ActionExecutionStatsProps {
  stats: MobileAnalyticsStatsResponse | null;
}

const statusColor = (status: MobileAnalyticsStatsResponse['systemStatus']): 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'degraded':
      return 'warning';
    case 'error':
    default:
      return 'error';
  }
};

export const ActionExecutionStats: React.FC<ActionExecutionStatsProps> = ({ stats }) => {
  const errorRate = stats?.errorRate ?? 0;
  const successRate = Math.max(0, 1 - errorRate);

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
          <Typography variant="h6">Execution stats</Typography>
          {stats ? (
            <Chip
              size="small"
              label={stats.systemStatus}
              color={statusColor(stats.systemStatus)}
              variant="outlined"
            />
          ) : (
            <Chip size="small" label="unknown" variant="outlined" />
          )}
        </Box>

        <Box display="flex" gap={3} flexWrap="wrap" sx={{ mt: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Success rate
            </Typography>
            <Typography variant="h6">{Math.round(successRate * 100)}%</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Error rate
            </Typography>
            <Typography variant="h6">{Math.round(errorRate * 100)}%</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Top event types (processed)
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Event type</TableCell>
              <TableCell align="right">Count</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(stats?.topEventTypes ?? []).map((row) => (
              <TableRow key={row.eventType} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>{row.eventType}</TableCell>
                <TableCell align="right">{row.count}</TableCell>
              </TableRow>
            ))}
            {(!stats?.topEventTypes || stats.topEventTypes.length === 0) ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography variant="body2" color="text.secondary">
                    No data available.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

