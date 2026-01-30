import React from 'react';
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { AdminMobileHooksRecentEvent } from '../../../../../services/api';

export interface RecentHookEventsPanelProps {
  events: AdminMobileHooksRecentEvent[];
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

export const RecentHookEventsPanel: React.FC<RecentHookEventsPanelProps> = ({ events }) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Recent hook events</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Latest events with processing status and per-action execution results.
      </Typography>

      {events.length ? (
        <Box sx={{ overflowX: 'auto', mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Received</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
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
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No recent events.
        </Typography>
      )}
    </Paper>
  );
};

