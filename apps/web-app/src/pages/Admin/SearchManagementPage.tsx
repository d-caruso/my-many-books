import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from './AdminLayout';
import { useApi } from '../../contexts/ApiContext';

export const SearchManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { apiService } = useApi();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pinnedResults, setPinnedResults] = useState<any[]>([]);

  const fetchPinnedResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Implement API call to fetch pinned results
      setPinnedResults([]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch pinned results');
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  useEffect(() => {
    fetchPinnedResults();
  }, [fetchPinnedResults]);

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('search.pinned.title', 'Search Management')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper sx={{ p: 3 }}>
            <Typography variant="body1">
              {t('search.pinned.empty', 'No pinned results yet')}
            </Typography>
          </Paper>
        )}
      </Box>
    </AdminLayout>
  );
};
