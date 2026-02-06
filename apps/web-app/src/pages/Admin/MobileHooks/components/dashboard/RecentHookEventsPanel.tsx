import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import type { AdminMobileHooksRecentEvent } from '../../../../../services/api';

export interface RecentHookEventsPanelProps {
  events: AdminMobileHooksRecentEvent[];
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  onRefresh?: () => void | Promise<void>;
}

const eventStatusColor = (
  status: AdminMobileHooksRecentEvent['processingStatus']
): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'processed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
};

const actionStatusColor = (
  status: AdminMobileHooksRecentEvent['actionExecutions'][number]['status']
): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'success':
      return 'success';
    case 'failed':
      return 'error';
    case 'skipped':
      return 'default';
    default:
      return 'default';
  }
};

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export const RecentHookEventsPanel: React.FC<RecentHookEventsPanelProps> = ({
  events,
  loading = false,
  refreshing = false,
  error = null,
  onRefresh,
}) => {
  const { t } = useTranslation('pages');
  const showEmptyState = !loading && events.length === 0;

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h6">{t('admin.mobile_hooks.dashboard.recent_events.title')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('admin.mobile_hooks.dashboard.recent_events.description')}
          </Typography>
        </Box>
        {onRefresh ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={refreshing ? <CircularProgress size={14} /> : <RefreshIcon />}
            onClick={() => void onRefresh()}
            disabled={loading || refreshing}
          >
            {t('admin.mobile_hooks.actions.refresh')}
          </Button>
        ) : null}
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box display="flex" alignItems="center" gap={2} sx={{ mt: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            {t('admin.mobile_hooks.dashboard.recent_events.loading')}
          </Typography>
        </Box>
      ) : null}

      {events.length ? (
        <Box sx={{ overflowX: 'auto', mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.mobile_hooks.columns.received')}</TableCell>
                <TableCell>{t('admin.mobile_hooks.columns.event')}</TableCell>
                <TableCell>{t('admin.mobile_hooks.columns.status')}</TableCell>
                <TableCell>{t('admin.mobile_hooks.columns.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.eventId} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(event.createdAt)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {event.eventType}
                    </Typography>
                    {event.processingError ? (
                      <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                        {event.processingError}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={event.processingStatus}
                      color={eventStatusColor(event.processingStatus)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" flexWrap="wrap" gap={0.75}>
                      {event.actionExecutions.length ? (
                        event.actionExecutions.map((execution) => (
                          <Chip
                            key={`${event.eventId}:${execution.actionType}:${execution.executedAt}`}
                            size="small"
                            label={`${execution.actionType}:${execution.status}`}
                            color={actionStatusColor(execution.status)}
                            variant="outlined"
                          />
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : showEmptyState ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('admin.mobile_hooks.dashboard.recent_events.no_recent_events')}
        </Typography>
      ) : null}
    </Paper>
  );
};
