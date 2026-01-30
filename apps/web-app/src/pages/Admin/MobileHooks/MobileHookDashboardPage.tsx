import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AdminLayout } from '../AdminLayout';
import { useApi } from '../../../contexts/ApiContext';
import type {
  AdminMobileHooksActionMappings,
  AdminMobileHooksActionTypesResponse,
  AdminMobileHooksActionsConfigMappingsResponse,
  AdminMobileHooksConfigListenersResponse,
  AdminMobileHooksEmergencyStatusResponse,
  AdminMobileHooksHealthResponse,
} from '../../../services/api';
import { HookOverviewCard } from './components/HookOverviewCard';
import { HookListenersTable } from './components/HookListenersTable';
import { ActionMappingGrid } from './components/ActionMappingGrid';
import { EmergencyControlsPanel } from './components/EmergencyControlsPanel';

export const MobileHookDashboardPage: React.FC = () => {
  const { apiService } = useApi();

  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [health, setHealth] = useState<AdminMobileHooksHealthResponse | null>(null);
  const [emergency, setEmergency] = useState<AdminMobileHooksEmergencyStatusResponse | null>(null);
  const [listenersConfig, setListenersConfig] = useState<AdminMobileHooksConfigListenersResponse | null>(null);
  const [mappingsConfig, setMappingsConfig] = useState<AdminMobileHooksActionsConfigMappingsResponse | null>(null);
  const [actionTypes, setActionTypes] = useState<AdminMobileHooksActionTypesResponse | null>(null);

  const loadDashboard = useCallback(async () => {
    setError(null);
    const [healthRes, emergencyRes, listenersRes, mappingsRes, actionTypesRes] = await Promise.all([
      apiService.getAdminMobileHooksHealth(),
      apiService.getAdminMobileHooksEmergencyStatus(),
      apiService.getAdminMobileHooksConfigListeners(),
      apiService.getAdminMobileHooksActionsConfigMappings(),
      apiService.getAdminMobileHooksActionTypes(),
    ]);

    setHealth(healthRes);
    setEmergency(emergencyRes);
    setListenersConfig(listenersRes);
    setMappingsConfig(mappingsRes);
    setActionTypes(actionTypesRes);
  }, [apiService]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadDashboard();
      } catch (err: any) {
        setError(err?.message || 'Failed to load mobile hooks dashboard');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [loadDashboard]);

  const handleReload = async () => {
    try {
      setReloading(true);
      await loadDashboard();
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh mobile hooks dashboard');
    } finally {
      setReloading(false);
    }
  };

  const updateListener = async (eventName: string, enabled: boolean) => {
    setError(null);
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
    } catch (err: any) {
      setError(err?.message || `Failed to update listener: ${eventName}`);
    }
  };

  const updateCategory = async (categoryName: string, enabled: boolean) => {
    setError(null);
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
    } catch (err: any) {
      setError(err?.message || `Failed to update category: ${categoryName}`);
    }
  };

  const updateMappings = async (actions: AdminMobileHooksActionMappings) => {
    setError(null);
    const payload = await apiService.updateAdminMobileHooksActionsConfigMappings({ actions });
    setMappingsConfig(payload.config);
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

            {listenersConfig ? (
              <Grid item xs={12} md={6}>
                <HookListenersTable
                  listeners={listenersConfig.listeners}
                  categories={listenersConfig.categories}
                  disabled={reloading}
                  onToggleListener={updateListener}
                  onToggleCategory={updateCategory}
                />
              </Grid>
            ) : null}

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
          </Grid>
        )}
      </Box>
    </AdminLayout>
  );
};

export default MobileHookDashboardPage;

