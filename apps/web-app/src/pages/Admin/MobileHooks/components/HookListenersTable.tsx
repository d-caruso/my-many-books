import React from 'react';
import {
  Box,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { AdminMobileHooksConfigListenerMap } from '../../../../services/api';

export interface HookListenersTableProps {
  listeners: AdminMobileHooksConfigListenerMap;
  categories: AdminMobileHooksConfigListenerMap;
  disabled?: boolean;
  onToggleListener: (eventName: string, enabled: boolean) => void | Promise<void>;
  onToggleCategory: (categoryName: string, enabled: boolean) => void | Promise<void>;
}

export const HookListenersTable: React.FC<HookListenersTableProps> = ({
  listeners,
  categories,
  disabled = false,
  onToggleListener,
  onToggleCategory,
}) => {
  const listenerNames = Object.keys(listeners).sort();
  const categoryNames = Object.keys(categories).sort();

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Hook listeners (events)
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Event</TableCell>
              <TableCell align="right">Enabled</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listenerNames.map((eventName) => (
              <TableRow key={eventName} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>{eventName}</TableCell>
                <TableCell align="right">
                  <Switch
                    checked={listeners[eventName]?.enabled ?? false}
                    disabled={disabled}
                    onChange={(e) => onToggleListener(eventName, e.target.checked)}
                    inputProps={{ 'aria-label': `Toggle ${eventName}` }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Listener categories
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell align="right">Enabled</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categoryNames.map((categoryName) => (
              <TableRow key={categoryName} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>{categoryName}</TableCell>
                <TableCell align="right">
                  <Switch
                    checked={categories[categoryName]?.enabled ?? false}
                    disabled={disabled}
                    onChange={(e) => onToggleCategory(categoryName, e.target.checked)}
                    inputProps={{ 'aria-label': `Toggle ${categoryName}` }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

