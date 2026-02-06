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
import { useTranslation } from 'react-i18next';
import { SEVERITY, type Severity } from '@my-many-books/shared-design';
import type { MobileAnalyticsStatsResponse } from '../../../../../services/api';
import { severityToMuiColor, severityToMuiLinearProgressColor } from '../../../../../utils/severityToMuiColor';

export interface ErrorRateMonitorProps {
  stats: MobileAnalyticsStatsResponse | null;
}

const systemStatusToChipSeverity = (status: MobileAnalyticsStatsResponse['systemStatus']): Severity => {
  switch (status) {
    case 'healthy':
      return SEVERITY.SUCCESS;
    case 'degraded':
      return SEVERITY.WARNING;
    case 'disabled':
      return SEVERITY.NEUTRAL;
    case 'error':
    default:
      return SEVERITY.ERROR;
  }
};

const statusColor = (status: MobileAnalyticsStatsResponse['systemStatus']) =>
  severityToMuiColor(systemStatusToChipSeverity(status));

export const ErrorRateMonitor: React.FC<ErrorRateMonitorProps> = ({ stats }) => {
  const { t } = useTranslation('pages');
  const errorRate = stats?.errorRate ?? 0;
  const percent = Math.min(100, Math.max(0, errorRate * 100));
  const status = stats?.systemStatus ?? 'healthy';
  const progressSeverity = status === 'healthy' ? SEVERITY.SUCCESS : status === 'degraded' ? SEVERITY.WARNING : SEVERITY.ERROR;

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
          <Typography variant="h6">{t('admin.mobile_hooks.analytics.error_rate_monitor.title')}</Typography>
          {stats ? (
            <Chip size="small" label={status} color={statusColor(status)} variant="outlined" />
          ) : (
            <Chip size="small" label={t('admin.mobile_hooks.common.unknown')} variant="outlined" />
          )}
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('admin.mobile_hooks.analytics.error_rate_monitor.errors_last_24h')}
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={percent}
                color={severityToMuiLinearProgressColor(progressSeverity)}
              />
            </Box>
            <Typography variant="body2" sx={{ minWidth: 52, textAlign: 'right' }}>
              {Math.round(percent)}%
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {t('admin.mobile_hooks.analytics.error_rate_monitor.worst_action_types_last_24h')}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {t('admin.mobile_hooks.analytics.error_rate_monitor.worst_event_types_last_24h')}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('admin.mobile_hooks.columns.event_type')}</TableCell>
              <TableCell align="right">{t('admin.mobile_hooks.columns.attempted')}</TableCell>
              <TableCell align="right">{t('admin.mobile_hooks.columns.error_rate')}</TableCell>
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
                    {t('admin.mobile_hooks.analytics.error_rate_monitor.no_event_breakdown')}
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
