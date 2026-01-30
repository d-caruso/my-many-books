import React from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { AdminMobileHooksConfigListenerMap } from '../../../../../services/api';

export interface HookListenersTableProps {
  listeners?: AdminMobileHooksConfigListenerMap;
  categories?: AdminMobileHooksConfigListenerMap;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  onToggleListener: (eventName: string, enabled: boolean) => void | Promise<void>;
  onToggleCategory: (categoryName: string, enabled: boolean) => void | Promise<void>;
}

export const HookListenersTable: React.FC<HookListenersTableProps> = ({
  listeners = {},
  categories = {},
  loading = false,
  error = null,
  disabled = false,
  onToggleListener,
  onToggleCategory,
}) => {
  const listenerNames = Object.keys(listeners).sort();
  const categoryNames = Object.keys(categories).sort();

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 1 }}>
          <Typography variant="h6">Hook listeners (events)</Typography>
          {loading ? <CircularProgress size={16} /> : null}
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Event</TableCell>
              <TableCell align="right">Enabled</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && listenerNames.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      Loading listeners…
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : listenerNames.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography variant="body2" color="text.secondary">
                    No listeners configured.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              listenerNames.map((eventName) => (
                <TableRow key={eventName} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{eventName}</TableCell>
                  <TableCell align="right">
                    <Switch
                      checked={listeners[eventName]?.enabled ?? false}
                      disabled={disabled || loading}
                      onChange={(e) => onToggleListener(eventName, e.target.checked)}
                      inputProps={{ 'aria-label': `Toggle ${eventName}` }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 1 }}>
          <Typography variant="h6">Listener categories</Typography>
          {loading ? <CircularProgress size={16} /> : null}
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell align="right">Enabled</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && categoryNames.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      Loading categories…
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : categoryNames.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography variant="body2" color="text.secondary">
                    No categories configured.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              categoryNames.map((categoryName) => (
                <TableRow key={categoryName} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{categoryName}</TableCell>
                  <TableCell align="right">
                    <Switch
                      checked={categories[categoryName]?.enabled ?? false}
                      disabled={disabled || loading}
                      onChange={(e) => onToggleCategory(categoryName, e.target.checked)}
                      inputProps={{ 'aria-label': `Toggle ${categoryName}` }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};
