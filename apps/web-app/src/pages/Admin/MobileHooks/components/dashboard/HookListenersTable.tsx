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
import { useTranslation } from 'react-i18next';
import type { AdminMobileHooksConfigListenerMap } from '../../../../../services/api';

export interface HookListenersTableProps {
  listeners?: AdminMobileHooksConfigListenerMap;
  categories?: AdminMobileHooksConfigListenerMap;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  onToggleListener: (eventName: string, enabled: boolean) => void | Promise<void>;
  onToggleCategory: (categoryName: string, enabled: boolean) => void | Promise<void>;
  savingListeners?: Record<string, boolean>;
  savingCategories?: Record<string, boolean>;
}

export const HookListenersTable: React.FC<HookListenersTableProps> = ({
  listeners = {},
  categories = {},
  loading = false,
  error = null,
  disabled = false,
  onToggleListener,
  onToggleCategory,
  savingListeners = {},
  savingCategories = {},
}) => {
  const { t } = useTranslation('pages');
  const listenerNames = Object.keys(listeners).sort();
  const categoryNames = Object.keys(categories).sort();

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : null}

      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 1 }}>
          <Typography variant="h6">{t('admin.mobile_hooks.dashboard.listeners.listeners_title')}</Typography>
          {loading ? <CircularProgress size={16} /> : null}
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('admin.mobile_hooks.columns.event')}</TableCell>
              <TableCell align="right">{t('admin.mobile_hooks.columns.enabled')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && listenerNames.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      {t('admin.mobile_hooks.dashboard.listeners.loading_listeners')}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : listenerNames.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.mobile_hooks.dashboard.listeners.no_listeners')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              listenerNames.map((eventName) => {
                const isSaving = Boolean(savingListeners[eventName]);
                return (
                  <TableRow key={eventName} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{eventName}</TableCell>
                    <TableCell align="right">
                      <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
                        <Switch
                          checked={listeners[eventName]?.enabled ?? false}
                          disabled={disabled || loading || isSaving}
                          onChange={(e) => onToggleListener(eventName, e.target.checked)}
                          inputProps={{
                            'aria-label': t('admin.mobile_hooks.dashboard.listeners.toggle_aria', { name: eventName }),
                          }}
                        />
                        {isSaving ? <CircularProgress size={16} /> : null}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 1 }}>
          <Typography variant="h6">{t('admin.mobile_hooks.dashboard.listeners.categories_title')}</Typography>
          {loading ? <CircularProgress size={16} /> : null}
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('admin.mobile_hooks.columns.category')}</TableCell>
              <TableCell align="right">{t('admin.mobile_hooks.columns.enabled')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && categoryNames.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      {t('admin.mobile_hooks.dashboard.listeners.loading_categories')}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : categoryNames.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.mobile_hooks.dashboard.listeners.no_categories')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              categoryNames.map((categoryName) => {
                const isSaving = Boolean(savingCategories[categoryName]);
                return (
                  <TableRow key={categoryName} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{categoryName}</TableCell>
                    <TableCell align="right">
                      <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
                        <Switch
                          checked={categories[categoryName]?.enabled ?? false}
                          disabled={disabled || loading || isSaving}
                          onChange={(e) => onToggleCategory(categoryName, e.target.checked)}
                          inputProps={{
                            'aria-label': t('admin.mobile_hooks.dashboard.listeners.toggle_aria', { name: categoryName }),
                          }}
                        />
                        {isSaving ? <CircularProgress size={16} /> : null}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};
