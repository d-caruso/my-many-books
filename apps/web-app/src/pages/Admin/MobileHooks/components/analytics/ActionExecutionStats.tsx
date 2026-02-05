import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { MobileAnalyticsActionTypeBreakdown } from '@my-many-books/shared-types';

export interface ActionExecutionStatsProps {
  actionTypeBreakdown: MobileAnalyticsActionTypeBreakdown[];
}

export const ActionExecutionStats: React.FC<ActionExecutionStatsProps> = ({ actionTypeBreakdown }) => {
  const totalAttempted = actionTypeBreakdown.reduce((s, r) => s + r.attempted, 0);
  const totalSuccessful = actionTypeBreakdown.reduce((s, r) => s + r.successful, 0);
  const errorRate = totalAttempted ? (totalAttempted - totalSuccessful) / totalAttempted : 0;
  const successRate = 1 - errorRate;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Execution stats</Typography>

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
            {actionTypeBreakdown.map((row) => (
              <TableRow key={row.actionType} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>{row.actionType}</TableCell>
                <TableCell align="right">{row.attempted}</TableCell>
                <TableCell align="right">{row.successful}</TableCell>
                <TableCell align="right">{row.failed}</TableCell>
                <TableCell align="right">{Math.round(row.errorRate * 100)}%</TableCell>
              </TableRow>
            ))}
            {actionTypeBreakdown.length === 0 ? (
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
