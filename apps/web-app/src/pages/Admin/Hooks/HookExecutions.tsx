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
  CircularProgress,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from '@mui/x-data-grid';
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

type TranslateFn = (key: string, defaultValue?: string) => string;

const defaultFilters: ExecutionFilters = {
  success: 'all',
  from: '',
  to: '',
};

interface FilterControlsProps {
  filters: ExecutionFilters;
  filtersApplied: boolean;
  onUpdate: (next: Partial<ExecutionFilters>) => void;
  onRefresh: () => void;
  onClear: () => void;
  onBack: () => void;
  t: TranslateFn;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  filtersApplied,
  onUpdate,
  onRefresh,
  onClear,
  onBack,
  t,
}) => (
  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2} alignItems="center">
    <FormControl sx={{ minWidth: 160 }}>
      <InputLabel id="success-filter-label">
        {t('executions.filters.success', 'Status')}
      </InputLabel>
      <Select
        labelId="success-filter-label"
        value={filters.success}
        label={t('executions.filters.status', 'Status')}
        onChange={(event) =>
          onUpdate({
            success: event.target.value as ExecutionFilters['success'],
          })
        }
      >
        <MenuItem value="all">{t('executions.filters.all', 'All')}</MenuItem>
        <MenuItem value="success">{t('executions.filters.success_only', 'Success')}</MenuItem>
        <MenuItem value="failure">{t('executions.filters.failure_only', 'Failure')}</MenuItem>
      </Select>
    </FormControl>
    <TextField
      label={t('executions.filters.from', 'From Date')}
      type="date"
      value={filters.from}
      onChange={(event) => onUpdate({ from: event.target.value })}
      InputLabelProps={{ shrink: true }}
    />
    <TextField
      label={t('executions.filters.to', 'To Date')}
      type="date"
      value={filters.to}
      onChange={(event) => onUpdate({ to: event.target.value })}
      InputLabelProps={{ shrink: true }}
    />
    <Button variant="outlined" onClick={onRefresh}>
      {t('executions.actions.refresh', 'Refresh')}
    </Button>
    <Button variant="text" onClick={onClear} disabled={!filtersApplied}>
      {t('executions.actions.clear', 'Clear Filters')}
    </Button>
    <Button onClick={onBack} variant="text">
      {t('executions.actions.back', 'Back to Hooks')}
    </Button>
  </Stack>
);

export const HookExecutions: React.FC = () => {
  const { t } = useTranslation('hooks');
  const navigate = useNavigate();
  const { hookId } = useParams<{ hookId?: string }>();
  const { apiService } = useApi();

  const [executions, setExecutions] = useState<AdminHookExecution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExecutionFilters>(defaultFilters);
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
      setError(err?.message || t('executions.errors.fetch', 'Failed to load executions'));
    } finally {
      setLoading(false);
    }
  }, [apiService, filters.from, filters.to, hookId, pagination.page, pagination.pageSize, successQuery, t]);

  useEffect(() => {
    void fetchExecutions();
  }, [fetchExecutions]);

  const updateFilters = (next: Partial<ExecutionFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPagination((prev) => ({ ...prev, page: 0 }));
  };

  const clearFilters = () => {
    setFilters({ ...defaultFilters });
    setPagination((prev) => ({ ...prev, page: 0 }));
  };

  const filtersApplied = filters.success !== 'all' || Boolean(filters.from) || Boolean(filters.to);

  const columns: GridColDef[] = [
    { field: 'eventName', headerName: t('executions.columns.event_name', 'Event'), flex: 1.2, minWidth: 180 },
    {
      field: 'success',
      headerName: t('executions.columns.success', 'Success'),
      flex: 0.6,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams<boolean>) => (
        <Chip
          label={
            params.value
              ? t('executions.status.success', 'Success')
              : t('executions.status.failure', 'Failure')
          }
          color={params.value ? 'success' : 'error'}
          size="small"
        />
      ),
    },
    {
      field: 'executionTimeMs',
      headerName: t('executions.columns.duration', 'Duration (ms)'),
      flex: 0.6,
      minWidth: 140,
    },
    {
      field: 'executedAt',
      headerName: t('executions.columns.executed_at', 'Executed At'),
      flex: 1,
      minWidth: 180,
      valueGetter: (params) => new Date(params.value as string).toLocaleString(),
    },
    {
      field: 'errorMessage',
      headerName: t('executions.columns.error', 'Error'),
      flex: 1,
      minWidth: 220,
      renderCell: (params: GridRenderCellParams<string | undefined>) => params.value || '-',
    },
  ];

  const LoadingOverlay = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        gap: 1,
      }}
    >
      <CircularProgress size={32} />
      <Typography variant="body2" color="textSecondary">
        {t('list.loading', 'Loading hooks…')}
      </Typography>
    </Box>
  );

  const EmptyOverlay = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 3,
        py: 4,
        gap: 1,
      }}
    >
      <Typography variant="subtitle1">{t('executions.empty.title', 'No executions yet')}</Typography>
      <Typography variant="body2" color="textSecondary">
        {filtersApplied
          ? t('executions.empty.filtered', 'No executions match the current filters.')
          : t(
              'executions.empty.description',
              'This hook has not produced any executions. Trigger an event or wait for it to run.'
            )}
      </Typography>
    </Box>
  );

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 1.5 }}>
          {t('executions.title', 'Hook Executions')}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {t(
            'executions.subtitle',
            'Inspect historical runs to debug or audit automation behavior.'
          )}{' '}
          {hookId && `#${hookId}`}
        </Typography>
                <FilterControls
          filters={filters}
          filtersApplied={filtersApplied}
          onUpdate={updateFilters}
          onRefresh={() => void fetchExecutions()}
          onClear={clearFilters}
          onBack={() => navigate('/admin/hooks')}
          t={t}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {filtersApplied && (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => clearFilters()}>
            {t('executions.filters.status', 'Status')}:{' '}
            {filters.success === 'all'
              ? t('executions.filters.all', 'All')
              : filters.success === 'success'
              ? t('executions.filters.success_only', 'Success')
              : t('executions.filters.failure_only', 'Failure')}
            {filters.from && ` • ${t('executions.filters.from', 'From Date')}: ${filters.from}`}
            {filters.to && ` • ${t('executions.filters.to', 'To Date')}: ${filters.to}`}
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
            slots={{
              loadingOverlay: LoadingOverlay,
              noRowsOverlay: EmptyOverlay,
            }}
          />
        </Paper>
      </Box>
    </AdminLayout>
  );
};

export default HookExecutions;
