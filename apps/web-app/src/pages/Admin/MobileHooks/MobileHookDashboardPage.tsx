import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Snackbar, Typography } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../AdminLayout';
import { useApi } from '../../../contexts/ApiContext';
import type {
  AdminMobileHooksActionMappings,
  AdminMobileHooksActionTypesResponse,
  AdminMobileHooksActionsConfigMappingsResponse,
  AdminMobileHooksConfigListenersResponse,
  AdminMobileHooksEmergencyStatusResponse,
  AdminMobileHooksHealthResponse,
  AdminMobileHooksRecentEventsResponse,
} from '../../../services/api';
import { HookOverviewCard } from './components/dashboard/HookOverviewCard';
import { HookListenersTable } from './components/dashboard/HookListenersTable';
import { ActionMappingGrid } from './components/dashboard/ActionMappingGrid';
import { EmergencyControlsPanel } from './components/dashboard/EmergencyControlsPanel';
import { RecentHookEventsPanel } from './components/dashboard/RecentHookEventsPanel';

const RECENT_EVENTS_POLL_INTERVAL_MS = 10_000;

export const MobileHookDashboardPage: React.FC = () => {
  const { apiService } = useApi();
  const { t } = useTranslation('pages');

  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successSnackbar, setSuccessSnackbar] = useState<{ message: string; key: number } | null>(
    null
  );

  const [health, setHealth] = useState<AdminMobileHooksHealthResponse | null>(null);
  const [emergency, setEmergency] = useState<AdminMobileHooksEmergencyStatusResponse | null>(null);
  const [listenersConfig, setListenersConfig] = useState<AdminMobileHooksConfigListenersResponse | null>(null);
  const [mappingsConfig, setMappingsConfig] = useState<AdminMobileHooksActionsConfigMappingsResponse | null>(null);
  const [actionTypes, setActionTypes] = useState<AdminMobileHooksActionTypesResponse | null>(null);
  const [recentEvents, setRecentEvents] = useState<AdminMobileHooksRecentEventsResponse | null>(null);

  const listenersAbortRef = useRef<AbortController | null>(null);
  const [listenersLoading, setListenersLoading] = useState(false);
  const [listenersError, setListenersError] = useState<string | null>(null);

  const recentEventsAbortRef = useRef<AbortController | null>(null);
  const [recentEventsLoading, setRecentEventsLoading] = useState(false);
  const [recentEventsRefreshing, setRecentEventsRefreshing] = useState(false);
  const [recentEventsError, setRecentEventsError] = useState<string | null>(null);

  const showSuccess = useCallback((message: string) => {
    setSuccessSnackbar({ message, key: Date.now() });
  }, []);

  const loadDashboard = useCallback(async () => {
    setError(null);
    const [healthRes, emergencyRes, mappingsRes, actionTypesRes] =
      await Promise.all([
        apiService.getAdminMobileHooksHealth(),
        apiService.getAdminMobileHooksEmergencyStatus(),
        apiService.getAdminMobileHooksActionsConfigMappings(),
        apiService.getAdminMobileHooksActionTypes(),
      ]);

    setHealth(healthRes);
    setEmergency(emergencyRes);
    setMappingsConfig(mappingsRes);
    setActionTypes(actionTypesRes);
  }, [apiService, t]);

  const loadListeners = useCallback(async () => {
    listenersAbortRef.current?.abort();
    const controller = new AbortController();
    listenersAbortRef.current = controller;

    setListenersLoading(true);
    setListenersError(null);

    try {
      const payload = await apiService.getAdminMobileHooksConfigListeners(controller.signal);
      if (controller.signal.aborted) return;
      setListenersConfig(payload);
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setListenersError(t('admin.mobile_hooks.errors.listeners.load'));
    } finally {
      if (controller.signal.aborted) return;
      setListenersLoading(false);
    }
  }, [apiService]);

  const loadRecentEvents = useCallback(
    async (opts?: { background?: boolean }) => {
      recentEventsAbortRef.current?.abort();
      const controller = new AbortController();
      recentEventsAbortRef.current = controller;

      const isBackground = opts?.background === true;

      if (!isBackground) {
        setRecentEventsLoading(true);
        setRecentEventsRefreshing(true);
        setRecentEventsError(null);
      }

      try {
        const payload = await apiService.getAdminMobileHooksRecentEvents(50, controller.signal);
        if (controller.signal.aborted) return;
        setRecentEvents(payload);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setRecentEventsError(t('admin.mobile_hooks.errors.recent_events.load'));
      } finally {
        if (controller.signal.aborted) return;
        if (!isBackground) {
          setRecentEventsLoading(false);
          setRecentEventsRefreshing(false);
        }
      }
    },
    [apiService, t]
  );

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadDashboard();
      } catch (err: any) {
        setError(t('admin.mobile_hooks.errors.dashboard.load'));
      } finally {
        setLoading(false);
        void loadListeners();
        void loadRecentEvents();
      }
    };

    void run();
    return () => {
      listenersAbortRef.current?.abort();
      recentEventsAbortRef.current?.abort();
    };
  }, [loadDashboard, loadListeners, loadRecentEvents]);

  useEffect(() => {
    if (loading) return;
    const intervalId = window.setInterval(() => {
      if (reloading || recentEventsRefreshing || recentEventsLoading) return;
      void loadRecentEvents({ background: true });
    }, RECENT_EVENTS_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadRecentEvents, loading, reloading, recentEventsLoading, recentEventsRefreshing]);

  const handleReload = async () => {
    try {
      setReloading(true);
      await Promise.all([loadDashboard(), loadListeners(), loadRecentEvents()]);
    } catch (err: any) {
      setError(t('admin.mobile_hooks.errors.dashboard.refresh'));
    } finally {
      setReloading(false);
    }
  };

  const updateListener = async (eventName: string, enabled: boolean) => {
    setListenersError(null);
    try {
      await apiService.updateAdminMobileHooksConfigListeners({
        listeners: { [eventName]: { enabled } },
      });

      setListenersConfig((prev) =>
        prev
          ? {
              ...prev,
              listeners: {
                ...prev.listeners,
                [eventName]: { enabled },
              },
            }
          : prev
      );
      showSuccess(t('admin.mobile_hooks.success.saved'));
    } catch (err: any) {
      setListenersError(t('admin.mobile_hooks.errors.listeners.save_listener', { name: eventName }));
    }
  };

  const updateCategory = async (categoryName: string, enabled: boolean) => {
    setListenersError(null);
    try {
      await apiService.updateAdminMobileHooksConfigListeners({
        categories: { [categoryName]: { enabled } },
      });

      setListenersConfig((prev) =>
        prev
          ? {
              ...prev,
              categories: {
                ...prev.categories,
                [categoryName]: { enabled },
              },
            }
          : prev
      );
      showSuccess(t('admin.mobile_hooks.success.saved'));
    } catch (err: any) {
      setListenersError(t('admin.mobile_hooks.errors.listeners.save_category', { name: categoryName }));
    }
  };

  const updateMappings = async (actions: AdminMobileHooksActionMappings) => {
    setError(null);
    const payload = await apiService.updateAdminMobileHooksActionsConfigMappings({ actions });
    setMappingsConfig(payload.config);
    showSuccess(t('admin.mobile_hooks.success.saved'));
  };

  const updateEmergency = async (request: { enabled: boolean; reason?: string }) => {
    setError(null);
    await apiService.updateAdminMobileHooksEmergencyStatus(request);
    const [nextEmergency, nextHealth] = await Promise.all([
      apiService.getAdminMobileHooksEmergencyStatus(),
      apiService.getAdminMobileHooksHealth(),
    ]);
    setEmergency(nextEmergency);
    setHealth(nextHealth);
    showSuccess(t('admin.mobile_hooks.success.updated'));
  };

  return (
    <AdminLayout>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h4">Mobile Hooks</Typography>
          <Button
            variant="outlined"
            startIcon={reloading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => void handleReload()}
            disabled={reloading || loading}
          >
            Refresh
          </Button>
        </Box>

        {error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <HookOverviewCard health={health} emergency={emergency} listenersConfig={listenersConfig} />
            </Grid>

            <Grid item xs={12} md={6}>
              <HookListenersTable
                listeners={listenersConfig?.listeners}
                categories={listenersConfig?.categories}
                loading={listenersLoading}
                error={listenersError}
                disabled={reloading}
                onToggleListener={updateListener}
                onToggleCategory={updateCategory}
              />
            </Grid>

            {mappingsConfig && actionTypes ? (
              <Grid item xs={12} md={6}>
                <ActionMappingGrid
                  config={mappingsConfig}
                  actionTypes={actionTypes}
                  disabled={reloading}
                  onUpdateMappings={updateMappings}
                />
              </Grid>
            ) : null}

            <Grid item xs={12}>
              <EmergencyControlsPanel emergency={emergency} onUpdate={updateEmergency} />
            </Grid>

            <Grid item xs={12}>
              <RecentHookEventsPanel
                events={recentEvents?.events ?? []}
                loading={recentEventsLoading}
                refreshing={recentEventsRefreshing}
                error={recentEventsError}
                onRefresh={() => loadRecentEvents()}
              />
            </Grid>
          </Grid>
        )}
      </Box>

      <Snackbar
        key={successSnackbar?.key}
        open={Boolean(successSnackbar)}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={(_event, reason) => {
          if (reason === 'clickaway') return;
          setSuccessSnackbar(null);
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSuccessSnackbar(null)}
        >
          {successSnackbar?.message}
        </Alert>
      </Snackbar>
    </AdminLayout>
  );
};

export default MobileHookDashboardPage;
