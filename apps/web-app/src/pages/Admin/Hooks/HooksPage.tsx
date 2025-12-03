import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
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
import { HooksList } from './HooksList';
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
          <HooksList
            hooks={hooks}
            loading={loading}
            onEdit={(id) => navigate(`/admin/hooks/${id}/edit`)}
            onViewExecutions={(id) => navigate(`/admin/hooks/${id}/executions`)}
            onDelete={(id) => setError(t('pages:admin.hooks.errors.delete', 'Delete action is not implemented yet'))}
          />
        </Paper>
      </Box>
    </AdminLayout>
  );
};

export default HooksPage;
