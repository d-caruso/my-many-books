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
import { useTranslation } from 'react-i18next';
import type { MobileAnalyticsActionTypeBreakdown } from '@my-many-books/shared-types';

export interface ActionExecutionStatsProps {
  actionTypeBreakdown: MobileAnalyticsActionTypeBreakdown[];
}

export const ActionExecutionStats: React.FC<ActionExecutionStatsProps> = ({ actionTypeBreakdown }) => {
  const { t } = useTranslation('pages');
  const totalAttempted = actionTypeBreakdown.reduce((s, r) => s + r.attempted, 0);
  const totalSuccessful = actionTypeBreakdown.reduce((s, r) => s + r.successful, 0);
  const errorRate = totalAttempted ? (totalAttempted - totalSuccessful) / totalAttempted : 0;
  const successRate = 1 - errorRate;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{t('admin.mobile_hooks.analytics.action_execution_stats.title')}</Typography>

        <Box display="flex" gap={3} flexWrap="wrap" sx={{ mt: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('admin.mobile_hooks.analytics.action_execution_stats.success_rate')}
            </Typography>
            <Typography variant="h6">{Math.round(successRate * 100)}%</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('admin.mobile_hooks.analytics.action_execution_stats.error_rate')}
            </Typography>
            <Typography variant="h6">{Math.round(errorRate * 100)}%</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {t('admin.mobile_hooks.analytics.action_execution_stats.by_action_type')}
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('admin.mobile_hooks.columns.action_type')}</TableCell>
              <TableCell align="right">{t('admin.mobile_hooks.columns.attempted')}</TableCell>
              <TableCell align="right">{t('admin.mobile_hooks.columns.success')}</TableCell>
              <TableCell align="right">{t('admin.mobile_hooks.columns.failed')}</TableCell>
              <TableCell align="right">{t('admin.mobile_hooks.columns.error_rate')}</TableCell>
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
                    {t('admin.mobile_hooks.analytics.action_execution_stats.no_data')}
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
