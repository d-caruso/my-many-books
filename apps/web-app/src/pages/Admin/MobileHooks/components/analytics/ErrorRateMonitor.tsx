import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { MobileAnalyticsStatsResponse } from '../../../../../services/api';

export interface ErrorRateMonitorProps {
  stats: MobileAnalyticsStatsResponse | null;
}

const statusColor = (status: MobileAnalyticsStatsResponse['systemStatus']): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'degraded':
      return 'warning';
    case 'disabled':
      return 'default';
    case 'error':
    default:
      return 'error';
  }
};

export const ErrorRateMonitor: React.FC<ErrorRateMonitorProps> = ({ stats }) => {
  const errorRate = stats?.errorRate ?? 0;
  const percent = Math.min(100, Math.max(0, errorRate * 100));
  const status = stats?.systemStatus ?? 'healthy';

  const worstEventTypes = useMemo(() => {
    const rows = stats?.eventTypeBreakdown ?? [];
    return rows
      .slice()
      .sort((a, b) => (b.errorRate ?? 0) - (a.errorRate ?? 0))
      .slice(0, 5);
  }, [stats?.eventTypeBreakdown]);

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
          <Typography variant="h6">Error rate</Typography>
          {stats ? (
            <Chip size="small" label={status} color={statusColor(status)} variant="outlined" />
          ) : (
            <Chip size="small" label="unknown" variant="outlined" />
          )}
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Errors (last 24h)
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={percent}
                color={status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : 'error'}
              />
            </Box>
            <Typography variant="body2" sx={{ minWidth: 52, textAlign: 'right' }}>
              {Math.round(percent)}%
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Worst action types (last 24h)
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Worst event types (last 24h)
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Event type</TableCell>
              <TableCell align="right">Attempted</TableCell>
              <TableCell align="right">Error rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {worstEventTypes.map((row) => (
              <TableRow key={row.eventType} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>{row.eventType}</TableCell>
                <TableCell align="right">{row.attempted}</TableCell>
                <TableCell align="right">{Math.round(row.errorRate * 100)}%</TableCell>
              </TableRow>
            ))}
            {worstEventTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="body2" color="text.secondary">
                    No event breakdown available.
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
