import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from './AdminLayout';
import { apiService, type AuditLoggingStatus, type FullTextSearchStatus } from '../../services/api';
import { useSettings } from '../../contexts/SettingsContext';
import { SettingsApi } from '@my-many-books/shared-api';
import { AppSetting, BOOK_STATUS_CHANGE_BEHAVIOR } from '@my-many-books/shared-types';
import { useApi } from '../../contexts/ApiContext';

export const AdminSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { apiService: apiClient } = useApi();
  const { refreshSettings } = useSettings();

  // Audit logging state
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuditLoggingStatus | null>(null);

  // Full-text search state
  const [searchLoading, setSearchLoading] = useState(true);
  const [searchUpdating, setSearchUpdating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<FullTextSearchStatus | null>(null);

  // App settings state
  const [appSettings, setAppSettings] = useState<AppSetting[]>([]);
  const [appSettingsLoading, setAppSettingsLoading] = useState(true);
  const [appSettingsError, setAppSettingsError] = useState<string | null>(null);
  const [updatingSettings, setUpdatingSettings] = useState<Set<string>>(new Set());

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getAuditLoggingStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch audit logging status');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSearchStatus = useCallback(async () => {
    try {
      setSearchLoading(true);
      setSearchError(null);
      const data = await apiService.getFullTextSearchStatus();
      setSearchStatus(data);
    } catch (err: any) {
      setSearchError(err.response?.data?.message || 'Failed to fetch full-text search status');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleToggle = async () => {
    if (!status || !status.canChange) return;

    try {
      setUpdating(true);
      setError(null);
      const data = await apiService.updateAuditLoggingStatus(!status.enabled);
      setStatus(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update audit logging status');
    } finally {
      setUpdating(false);
    }
  };

  const getSourceBadge = (source: string) => {
    const badges = {
      force_disabled: { label: 'Disabled by deployment', color: 'error' as const },
      force_enabled: { label: 'Enforced by deployment', color: 'success' as const },
      database: { label: 'Controlled via admin panel', color: 'primary' as const },
      default: { label: 'Default setting', color: 'default' as const },
    };
    const badge = badges[source as keyof typeof badges] || badges.default;
    return <Chip label={badge.label} color={badge.color} size="small" sx={{ ml: 2 }} />;
  };

  const getHelpText = (source: string, canChange: boolean) => {
    if (source === 'force_disabled') {
      return 'Audit logging is permanently disabled by infrastructure configuration (AUDIT_LOGGING_FORCE_DISABLED=true). Contact your system administrator to enable it.';
    }
    if (source === 'force_enabled') {
      return 'Audit logging is permanently enabled by infrastructure configuration (AUDIT_LOGGING_FORCE_ENABLED=true) for compliance requirements. It cannot be disabled via this panel.';
    }
    if (canChange) {
      return 'Toggle audit logging on or off. This setting is stored in the database and takes effect immediately (with 30-second cache). All admin actions (create, update, delete) will be logged when enabled.';
    }
    return 'Audit logging configuration.';
  };

  const fetchAppSettings = useCallback(async () => {
    try {
      setAppSettingsLoading(true);
      setAppSettingsError(null);
      const settingsApi = new SettingsApi(apiClient);
      const settings = await settingsApi.getAllSettingsAdmin();
      setAppSettings(settings);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setAppSettingsError(error.response?.data?.message || error.message || 'Failed to fetch settings');
    } finally {
      setAppSettingsLoading(false);
    }
  }, [apiClient]);

  // Update setting value
  const handleSettingChange = async (key: string, value: unknown) => {
    try {
      setUpdatingSettings(prev => new Set(prev).add(key));
      setAppSettingsError(null);
      const settingsApi = new SettingsApi(apiClient);
      const updated = await settingsApi.updateSetting(key, value);

      // Update local state
      setAppSettings(prev =>
        prev.map(s => s.key === key ? updated : s)
      );

      // Refresh global settings context
      await refreshSettings();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setAppSettingsError(error.response?.data?.message || error.message || 'Failed to update setting');
    } finally {
      setUpdatingSettings(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Toggle setting active status
  const handleToggleActive = async (key: string, active: boolean) => {
    try {
      setUpdatingSettings(prev => new Set(prev).add(key));
      setAppSettingsError(null);
      const settingsApi = new SettingsApi(apiClient);
      const updated = await settingsApi.toggleActive(key, active);

      // Update local state
      setAppSettings(prev =>
        prev.map(s => s.key === key ? updated : s)
      );

      // Refresh global settings context if setting is being activated
      if (active) {
        await refreshSettings();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setAppSettingsError(error.response?.data?.message || error.message || 'Failed to toggle setting');
    } finally {
      setUpdatingSettings(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Parse setting value
  const parseSettingValue = (setting: AppSetting) => {
    try {
      return JSON.parse(setting.value);
    } catch {
      return setting.value;
    }
  };

  // Get setting description
  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      'books.list.status.onchange': 'Controls what happens to a book in the list when its status changes. REMOVE: book disappears from the list, KEEP: book stays in the list with updated status, REFRESH: reload the entire list.',
    };
    return descriptions[key] || 'No description available';
  };

  // Fetch audit logging status, search status, and app settings
  useEffect(() => {
    fetchStatus();
    fetchSearchStatus();
    fetchAppSettings();
  }, [fetchStatus, fetchSearchStatus, fetchAppSettings]);

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          {t('pages:admin.settings.page_title', 'Settings')}
        </Typography>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Audit Logging
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : status ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={status.enabled}
                      onChange={handleToggle}
                      disabled={!status.canChange || updating}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography>
                        {status.enabled ? 'Enabled' : 'Disabled'}
                        {updating && (
                          <CircularProgress size={16} sx={{ ml: 1, verticalAlign: 'middle' }} />
                        )}
                      </Typography>
                      {getSourceBadge(status.source)}
                    </Box>
                  }
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                {getHelpText(status.source, status.canChange)}
              </Typography>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="caption" component="div" gutterBottom>
                  <strong>What gets logged:</strong>
                </Typography>
                <Typography variant="caption" component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>User ID and role at time of action</li>
                  <li>Action type (create, update, delete)</li>
                  <li>Resource type and ID</li>
                  <li>IP address and user agent</li>
                  <li>Timestamp and details</li>
                </Typography>
              </Box>
            </>
          ) : null}
        </Paper>

        {/* Application Settings */}
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Application Settings
          </Typography>

          {appSettingsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : appSettingsError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {appSettingsError}
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {appSettings
                .filter(setting => !setting.deleted)
                .map(setting => {
                  const value = parseSettingValue(setting);
                  const isUpdating = updatingSettings.has(setting.key);

                  return (
                    <Grid item xs={12} key={setting.key}>
                      <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, opacity: setting.active ? 1 : 0.6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'medium', flex: 1 }}>
                            {setting.key}
                          </Typography>
                          <Chip label={setting.category} size="small" color="primary" variant="outlined" sx={{ mr: 1 }} />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={setting.active}
                                onChange={(e) => handleToggleActive(setting.key, e.target.checked)}
                                disabled={isUpdating}
                                size="small"
                              />
                            }
                            label={setting.active ? 'Active' : 'Inactive'}
                          />
                        </Box>

                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          {getSettingDescription(setting.key)}
                        </Typography>

                        {setting.type === 'enum' && (
                          <FormControl fullWidth size="small" disabled={isUpdating || !setting.active}>
                            <InputLabel>Value</InputLabel>
                            <Select
                              value={value}
                              label="Value"
                              onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                            >
                              {setting.key === 'books.list.status.onchange' && [
                                <MenuItem key={BOOK_STATUS_CHANGE_BEHAVIOR.REMOVE} value={BOOK_STATUS_CHANGE_BEHAVIOR.REMOVE}>
                                  Remove (book disappears from list)
                                </MenuItem>,
                                <MenuItem key={BOOK_STATUS_CHANGE_BEHAVIOR.KEEP} value={BOOK_STATUS_CHANGE_BEHAVIOR.KEEP}>
                                  Keep (book stays in list)
                                </MenuItem>,
                                <MenuItem key={BOOK_STATUS_CHANGE_BEHAVIOR.REFRESH} value={BOOK_STATUS_CHANGE_BEHAVIOR.REFRESH}>
                                  Refresh (reload entire list)
                                </MenuItem>
                              ]}
                            </Select>
                            {isUpdating && (
                              <CircularProgress size={20} sx={{ position: 'absolute', right: 40, top: '50%', mt: -1 }} />
                            )}
                          </FormControl>
                        )}

                        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip label={`Default: ${JSON.parse(setting.defaultValue)}`} size="small" variant="outlined" />
                          <Chip label={setting.type} size="small" />
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
            </Grid>
          )}
        </Paper>
      </Box>
    </AdminLayout>
  );
};

export default AdminSettingsPage;
