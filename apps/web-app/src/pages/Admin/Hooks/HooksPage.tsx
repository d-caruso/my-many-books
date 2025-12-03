import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Tooltip,
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
import { HookForm, HookFormData } from './HookForm';
import type { AdminHookSummary, AdminHookStats } from '../../../services/api';

export const HooksPage: React.FC = () => {
  const { t } = useTranslation('hooks');
  const navigate = useNavigate();
  const { apiService } = useApi();

  const [stats, setStats] = useState<AdminHookStats | null>(null);
  const [hooks, setHooks] = useState<AdminHookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHook, setEditingHook] = useState<AdminHookSummary | null>(null);

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
        err?.message || t('errors.fetch', 'Failed to load hook data');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [apiService, t]);

  useEffect(() => {
    void loadHooksData();
  }, [loadHooksData]);

  const handleReload = useCallback(async () => {
    try {
      setReloading(true);
      setError(null);
      await apiService.reloadAdminHooks();
      await loadHooksData();
    } catch (err: any) {
      console.error('Failed to reload hooks:', err);
      const message =
        err?.message || t('errors.reload', 'Failed to reload hooks');
      setError(message);
    } finally {
      setReloading(false);
    }
  }, [apiService, loadHooksData, t]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setEditingHook(null);
        setIsFormOpen(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'r') {
        event.preventDefault();
        void handleReload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleReload]);

  const formattedLastReload = stats?.lastReloadedAt
    ? new Date(stats.lastReloadedAt).toLocaleString()
    : t('stats.never_reloaded', 'Never reloaded');

  const cardHelpers = {
    total: t('stats.total_helper', 'All hooks stored in the database, including disabled entries.'),
    active: t('stats.active_helper', 'Hooks currently enabled and ready to run.'),
    executions: t('stats.executions_helper', 'Executions recorded during the last 24 hours.'),
    reload: t('stats.reload_helper', 'Reload clears the in-memory cache on the API nodes.'),
  };

  const statsCards = [
    {
      title: t('stats.total_hooks', 'Total Hooks'),
      value: stats?.totalHooks ?? 0,
      icon: <WebhookIcon />,
      color: '#1e88e5',
      helperText: cardHelpers.total,
      tooltip: t('stats.total_tooltip', 'Includes archived hooks so you know how many recipes exist.'),
    },
    {
      title: t('stats.active_hooks', 'Active Hooks'),
      value: stats?.activeHooks ?? 0,
      icon: <BoltIcon />,
      color: '#2e7d32',
      helperText: cardHelpers.active,
      tooltip: t('stats.active_tooltip', 'Compare this number with the list below to catch desynced reloads.'),
    },
    {
      title: t('stats.executions_today', 'Executions Today'),
      value: stats?.executionsToday ?? 0,
      icon: <HistoryIcon />,
      color: '#ed6c02',
      helperText: cardHelpers.executions,
      tooltip: t('stats.executions_tooltip', 'Spikes usually mean a scheduled job or a new automation.'),
    },
    {
      title: t('stats.last_reload', 'Last Reload'),
      value: formattedLastReload,
      icon: <ReplayIcon />,
      color: '#9c27b0',
      helperText: t('stats.reload_hint', 'Reload when you deploy new hook configurations.'),
      tooltip: t('stats.reload_tooltip', 'Reload whenever you add/edit hooks directly in the database.'),
    },
  ];

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingHook(null);
  };

  const handleSaveHook = (data: HookFormData) => {
    setHooks((prev) => {
      if (editingHook) {
        return prev.map((hook) =>
          hook.id === editingHook.id
            ? {
                ...hook,
                name: data.name,
                eventPattern: data.eventPattern,
                isActive: data.isActive,
                priority: data.priority,
                actionType: data.actionType,
              }
            : hook
        );
      }
      const newHook: AdminHookSummary = {
        id: Date.now(),
        name: data.name,
        eventPattern: data.eventPattern,
        actionType: data.actionType,
        priority: data.priority,
        isActive: data.isActive,
        lastExecution: null,
      };
      return [newHook, ...prev];
    });

    setStats((prev) => {
      if (!prev) return prev;
      if (!editingHook) {
        return {
          ...prev,
          totalHooks: prev.totalHooks + 1,
          activeHooks: prev.activeHooks + (data.isActive ? 1 : 0),
        };
      }
      if (editingHook.isActive === data.isActive) {
        return prev;
      }
      return {
        ...prev,
        activeHooks: prev.activeHooks + (data.isActive ? 1 : -1),
      };
    });
  };

  return (
    <AdminLayout>
    <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          {t('title', 'Hooks Administration')}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          {t('subtitle', 'Monitor and orchestrate automation events across the platform.')}
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" sx={{ mb: 3 }}>
          <Tooltip title={t('actions.create_hint', 'Create a new hook (⌘K / Ctrl+K)')}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingHook(null);
                setIsFormOpen(true);
              }}
              data-testid="open-hook-form"
            >
              {t('actions.create', 'Create Hook')}
            </Button>
          </Tooltip>
          <Tooltip title={t('stats.reload_hint_with_shortcut', 'Reload when you deploy new hook configurations (⌘R / Ctrl+R)')}>
            <span>
              <Button
                variant="outlined"
                startIcon={reloading ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={handleReload}
                disabled={reloading}
                data-testid="reload-hooks-button"
              >
                {reloading
                  ? t('actions.reloading', 'Reloading Hooks…')
                  : t('actions.reload', 'Reload Hooks')}
              </Button>
            </span>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

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
              tooltip={card.tooltip}
              loading={loading}
            />
          ))}
        </Box>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
            {t('list.title', 'Hooks')}
          </Typography>
          <HooksList
            hooks={hooks}
            loading={loading}
            onEdit={(id) => {
              const hookToEdit = hooks.find((hook) => hook.id === id) || null;
              setEditingHook(hookToEdit);
              setIsFormOpen(true);
            }}
            onViewExecutions={(id) => navigate(`/admin/hooks/${id}/executions`)}
                onDelete={(id) =>
                  setError(t('errors.delete', 'Delete action is not implemented yet'))
                }
          />
        </Paper>
      </Box>
      <HookForm
        open={isFormOpen}
        initialData={editingHook ?? undefined}
        onClose={handleCloseForm}
        onSave={(data: HookFormData) => {
          handleSaveHook(data);
        }}
      />
    </AdminLayout>
  );
};

export default HooksPage;
