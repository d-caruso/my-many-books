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
import type { MobileAnalyticsStatsResponse } from '../../../../../services/api';

export interface ActionExecutionStatsProps {
  stats: MobileAnalyticsStatsResponse | null;
}

const statusColor = (status: MobileAnalyticsStatsResponse['systemStatus']): 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'degraded':
      return 'warning';
    case 'disabled':
      return 'warning';
    case 'error':
    default:
      return 'error';
  }
};

export const ActionExecutionStats: React.FC<ActionExecutionStatsProps> = ({ stats }) => {
  const errorRate = stats?.errorRate ?? 0;
  const successRate = Math.max(0, 1 - errorRate);
  const breakdown = stats?.actionTypeBreakdown ?? [];

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
          By action type (last 24h)
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Action type</TableCell>
              <TableCell align="right">Attempted</TableCell>
              <TableCell align="right">Success</TableCell>
              <TableCell align="right">Failed</TableCell>
              <TableCell align="right">Error rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {breakdown.map((row) => (
              <TableRow key={row.actionType} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>{row.actionType}</TableCell>
                <TableCell align="right">{row.attempted}</TableCell>
                <TableCell align="right">{row.successful}</TableCell>
                <TableCell align="right">{row.failed}</TableCell>
                <TableCell align="right">{Math.round(row.errorRate * 100)}%</TableCell>
              </TableRow>
            ))}
            {breakdown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
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
