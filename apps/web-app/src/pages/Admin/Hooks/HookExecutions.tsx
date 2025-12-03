import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Chip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../../contexts/ApiContext';
import type { AdminHookExecution } from '../../../services/api';
import { AdminLayout } from '../AdminLayout';

interface ExecutionFilters {
  success: 'all' | 'success' | 'failure';
  from: string;
  to: string;
}

export const HookExecutions: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hookId } = useParams<{ hookId?: string }>();
  const { apiService } = useApi();

  const [executions, setExecutions] = useState<AdminHookExecution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExecutionFilters>({
    success: 'all',
    from: '',
    to: '',
  });
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });

  const successQuery = useMemo(() => {
    if (filters.success === 'success') return true;
    if (filters.success === 'failure') return false;
    return undefined;
  }, [filters.success]);

  const fetchExecutions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAdminHookExecutions({
        hookId: hookId ? Number(hookId) : undefined,
        success: successQuery,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page: pagination.page + 1,
        pageSize: pagination.pageSize,
      });
      setExecutions(response.executions);
      setTotal(response.total);
    } catch (err: any) {
      console.error('Failed to load hook executions:', err);
      setError(err?.message || t('pages:admin.hooks.executions.errors.fetch', 'Failed to load executions'));
    } finally {
      setLoading(false);
    }
  }, [apiService, filters.from, filters.to, hookId, pagination.page, pagination.pageSize, successQuery, t]);

  useEffect(() => {
    void fetchExecutions();
  }, [fetchExecutions]);

  const columns: GridColDef[] = [
    { field: 'eventName', headerName: t('pages:admin.hooks.executions.columns.event_name', 'Event'), flex: 1.2, minWidth: 180 },
    {
      field: 'success',
      headerName: t('pages:admin.hooks.executions.columns.success', 'Success'),
      flex: 0.6,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams<boolean>) => (
        <Chip
          label={params.value ? 'Success' : 'Failure'}
          color={params.value ? 'success' : 'error'}
          size="small"
        />
      ),
    },
    {
      field: 'executionTimeMs',
      headerName: t('pages:admin.hooks.executions.columns.duration', 'Duration (ms)'),
      flex: 0.6,
      minWidth: 140,
    },
    {
      field: 'executedAt',
      headerName: t('pages:admin.hooks.executions.columns.executed_at', 'Executed At'),
      flex: 1,
      minWidth: 180,
      valueGetter: (params) => new Date(params.value as string).toLocaleString(),
    },
    {
      field: 'errorMessage',
      headerName: t('pages:admin.hooks.executions.columns.error', 'Error'),
      flex: 1,
      minWidth: 220,
      renderCell: (params: GridRenderCellParams<string | undefined>) => params.value || '-',
    },
  ];

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          {t('pages:admin.hooks.executions.title', 'Hook Executions')}
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2} alignItems="center">
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel id="success-filter-label">
              {t('pages:admin.hooks.executions.filters.success', 'Status')}
            </InputLabel>
            <Select
              labelId="success-filter-label"
              value={filters.success}
              label={t('pages:admin.hooks.executions.filters.status', 'Status')}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  success: event.target.value as ExecutionFilters['success'],
                }))
              }
            >
              <MenuItem value="all">{t('pages:admin.hooks.executions.filters.all', 'All')}</MenuItem>
              <MenuItem value="success">{t('pages:admin.hooks.executions.filters.success_only', 'Success')}</MenuItem>
              <MenuItem value="failure">{t('pages:admin.hooks.executions.filters.failure_only', 'Failure')}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label={t('pages:admin.hooks.executions.filters.from', 'From Date')}
            type="date"
            value={filters.from}
            onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t('pages:admin.hooks.executions.filters.to', 'To Date')}
            type="date"
            value={filters.to}
            onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="outlined" onClick={() => fetchExecutions()}>
            {t('pages:admin.hooks.executions.actions.refresh', 'Refresh')}
          </Button>
          <Button onClick={() => navigate('/admin/hooks')} variant="text">
            {t('pages:admin.hooks.executions.actions.back', 'Back to Hooks')}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <DataGrid
            rows={executions}
            columns={columns}
            autoHeight
            rowCount={total}
            pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            paginationMode="server"
            onPageChange={(newPage) => setPagination((prev) => ({ ...prev, page: newPage }))}
            onPageSizeChange={(newSize) => setPagination((prev) => ({ ...prev, pageSize: newSize }))}
            rowsPerPageOptions={[5, 10, 20]}
            loading={loading}
            getRowId={(row) => row.id}
          />
        </Paper>
      </Box>
    </AdminLayout>
  );
};

export default HookExecutions;
