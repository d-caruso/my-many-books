import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import WebhookIcon from '@mui/icons-material/Webhook';
import BoltIcon from '@mui/icons-material/Bolt';
import HistoryIcon from '@mui/icons-material/History';
import ReplayIcon from '@mui/icons-material/Replay';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../AdminLayout';
import { useApi } from '../../../contexts/ApiContext';
import { HookStatsCard } from './components/HookStatsCard';
import type { AdminHookSummary, AdminHookStats } from '../../../services/api';

export const HooksPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { apiService } = useApi();

  const [stats, setStats] = useState<AdminHookStats | null>(null);
  const [hooks, setHooks] = useState<AdminHookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);

  const loadHooksData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [hookStats, hookPayload] = await Promise.all([
        apiService.getAdminHookStats(),
        apiService.getAdminHooks(),
      ]);
      setStats(hookStats);
      setHooks(hookPayload.hooks || []);
    } catch (err: any) {
      console.error('Failed to load hooks data:', err);
      const message =
        err?.message || t('pages:admin.hooks.errors.fetch', 'Failed to load hook data');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [apiService, t]);

  useEffect(() => {
    void loadHooksData();
  }, [loadHooksData]);

  const handleReload = async () => {
    try {
      setReloading(true);
      setError(null);
      await apiService.reloadAdminHooks();
      await loadHooksData();
    } catch (err: any) {
      console.error('Failed to reload hooks:', err);
      const message =
        err?.message || t('pages:admin.hooks.errors.reload', 'Failed to reload hooks');
      setError(message);
    } finally {
      setReloading(false);
    }
  };

  const formattedLastReload = stats?.lastReloadedAt
    ? new Date(stats.lastReloadedAt).toLocaleString()
    : t('pages:admin.hooks.stats.never_reloaded', 'Never reloaded');

  const statsCards = [
    {
      title: t('pages:admin.hooks.stats.total_hooks', 'Total Hooks'),
      value: stats?.totalHooks ?? 0,
      icon: <WebhookIcon />,
      color: '#1e88e5',
    },
    {
      title: t('pages:admin.hooks.stats.active_hooks', 'Active Hooks'),
      value: stats?.activeHooks ?? 0,
      icon: <BoltIcon />,
      color: '#2e7d32',
    },
    {
      title: t('pages:admin.hooks.stats.executions_today', 'Executions Today'),
      value: stats?.executionsToday ?? 0,
      icon: <HistoryIcon />,
      color: '#ed6c02',
    },
    {
      title: t('pages:admin.hooks.stats.last_reload', 'Last Reload'),
      value: formattedLastReload,
      icon: <ReplayIcon />,
      color: '#9c27b0',
      helperText: t(
        'pages:admin.hooks.stats.reload_hint',
        'Reload when you deploy new hook configurations.'
      ),
    },
  ];

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          {t('pages:admin.hooks.title', 'Hooks Administration')}
        </Typography>

        <Box
          display="flex"
          flexWrap="wrap"
          gap={2}
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/hooks/new')}
          >
            {t('pages:admin.hooks.actions.create', 'Create Hook')}
          </Button>
          <Button
            variant="outlined"
            startIcon={reloading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleReload}
            disabled={reloading}
          >
            {reloading
              ? t('pages:admin.hooks.actions.reloading', 'Reloading Hooks…')
              : t('pages:admin.hooks.actions.reload', 'Reload Hooks')}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="180px"
            sx={{ mb: 3 }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              mb: 3,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {statsCards.map((card) => (
              <HookStatsCard
                key={card.title}
                title={card.title}
                value={card.value}
                icon={card.icon}
                color={card.color}
                helperText={card.helperText}
              />
            ))}
          </Box>
        )}

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="baseline"
            flexWrap="wrap"
            mb={2}
          >
            <Typography variant="h6">
              {t('pages:admin.hooks.list_title', 'Hooks')}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {t(
                'pages:admin.hooks.list_summary',
                '{{count}} configured',
                { count: stats?.totalHooks ?? hooks.length }
              )}
            </Typography>
          </Box>

          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight="160px"
            >
              <CircularProgress />
            </Box>
          ) : hooks.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              {t('pages:admin.hooks.no_hooks', 'No hooks configured yet.')}
            </Typography>
          ) : (
            <Stack spacing={2}>
              {hooks.map((hook) => (
                <Paper
                  key={hook.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2,
                    alignItems: 'flex-start',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1">{hook.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {hook.eventPattern}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {t(
                        'pages:admin.hooks.list_action_info',
                        '{{actionType}} • Priority {{priority}}',
                        {
                          actionType: hook.actionType,
                          priority: hook.priority,
                        }
                      )}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" display="block">
                      {hook.lastExecution
                        ? t(
                            'pages:admin.hooks.last_execution',
                            'Last executed {{timestamp}}',
                            {
                              timestamp: new Date(hook.lastExecution).toLocaleString(),
                            }
                          )
                        : t('pages:admin.hooks.never_executed', 'Never executed')}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={
                        hook.isActive
                          ? t('pages:admin.hooks.active', 'Active')
                          : t('pages:admin.hooks.inactive', 'Inactive')
                      }
                      variant={hook.isActive ? 'filled' : 'outlined'}
                      color={hook.isActive ? 'primary' : 'default'}
                      size="small"
                    />
                    <Typography variant="caption" color="textSecondary">
                      {t('pages:admin.hooks.priority_label', 'Priority {{priority}}', {
                        priority: hook.priority,
                      })}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </AdminLayout>
  );
};

export default HooksPage;
