import React from 'react';
import { Box, Card, CardContent, Chip, Divider, LinearProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type {
  AdminMobileHooksConfigListenersResponse,
  AdminMobileHooksEmergencyStatusResponse,
  AdminMobileHooksHealthResponse,
} from '../../../../../services/api';

export interface HookOverviewCardProps {
  health: AdminMobileHooksHealthResponse | null;
  emergency: AdminMobileHooksEmergencyStatusResponse | null;
  listenersConfig: AdminMobileHooksConfigListenersResponse | null;
}

const statusColor = (status: AdminMobileHooksHealthResponse['status']): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'degraded':
      return 'warning';
    case 'error':
      return 'error';
    case 'disabled':
    default:
      return 'default';
  }
};

export const HookOverviewCard: React.FC<HookOverviewCardProps> = ({
  health,
  emergency,
  listenersConfig,
}) => {
  const { t } = useTranslation('pages');
  const listenersEnabledCount = listenersConfig
    ? Object.values(listenersConfig.listeners).filter(v => v.enabled).length
    : 0;
  const listenersTotalCount = listenersConfig ? Object.keys(listenersConfig.listeners).length : 0;
  const categoriesEnabledCount = listenersConfig
    ? Object.values(listenersConfig.categories).filter(v => v.enabled).length
    : 0;
  const categoriesTotalCount = listenersConfig ? Object.keys(listenersConfig.categories).length : 0;

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
          <Typography variant="h6">{t('admin.mobile_hooks.dashboard.overview.title')}</Typography>
          {health ? (
            <Chip
              size="small"
              label={health.status}
              color={statusColor(health.status)}
              variant="outlined"
            />
          ) : (
            <Chip size="small" label={t('admin.mobile_hooks.common.unknown')} variant="outlined" />
          )}
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('admin.mobile_hooks.dashboard.overview.health_score')}
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={health?.healthScore ?? 0}
                color={health?.status === 'healthy' ? 'success' : health?.status === 'degraded' ? 'warning' : 'error'}
              />
            </Box>
            <Typography variant="body2" sx={{ minWidth: 44, textAlign: 'right' }}>
              {health?.healthScore ?? 0}%
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box display="flex" gap={3} flexWrap="wrap">
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('admin.mobile_hooks.dashboard.overview.listeners_enabled')}
            </Typography>
            <Typography variant="h6">
              {listenersEnabledCount}/{listenersTotalCount}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('admin.mobile_hooks.dashboard.overview.categories_enabled')}
            </Typography>
            <Typography variant="h6">
              {categoriesEnabledCount}/{categoriesTotalCount}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('admin.mobile_hooks.dashboard.labels.mobile_hooks_enabled')}
            </Typography>
            <Typography variant="h6">
              {emergency?.enabled ? t('admin.mobile_hooks.common.yes') : t('admin.mobile_hooks.common.no')}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
