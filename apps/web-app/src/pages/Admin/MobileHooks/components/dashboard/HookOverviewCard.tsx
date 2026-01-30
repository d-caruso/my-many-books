import React from 'react';
import { Box, Card, CardContent, Chip, Divider, LinearProgress, Typography } from '@mui/material';
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
          <Typography variant="h6">Mobile Hooks Overview</Typography>
          {health ? (
            <Chip
              size="small"
              label={health.status}
              color={statusColor(health.status)}
              variant="outlined"
            />
          ) : (
            <Chip size="small" label="unknown" variant="outlined" />
          )}
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Health score
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
              Listeners enabled
            </Typography>
            <Typography variant="h6">
              {listenersEnabledCount}/{listenersTotalCount}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Categories enabled
            </Typography>
            <Typography variant="h6">
              {categoriesEnabledCount}/{categoriesTotalCount}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Mobile hooks enabled
            </Typography>
            <Typography variant="h6">{emergency?.enabled ? 'Yes' : 'No'}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
