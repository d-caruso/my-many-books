import React from 'react';
import {
  Box,
  Button,
  Stack,
  Chip,
  Tooltip,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
} from '@mui/x-data-grid';
import { AdminHookSummary } from '../../../services/api';
import { useTranslation } from 'react-i18next';

export interface HooksListProps {
  hooks: AdminHookSummary[];
  loading?: boolean;
  onEdit?: (hookId: number) => void;
  onDelete?: (hookId: number) => void;
  onViewExecutions?: (hookId: number) => void;
}

export const HooksList: React.FC<HooksListProps> = ({
  hooks,
  loading = false,
  onEdit,
  onDelete,
  onViewExecutions,
}) => {
  const { t } = useTranslation('hooks');
  const actionLabels: Record<string, string> = {
    log: t('form.action_types.log', 'Log'),
    email: t('form.action_types.email', 'Email'),
    database: t('form.action_types.database', 'Database'),
  };

  const StatusChip: React.FC<{ value: boolean }> = ({ value }) => (
    <Chip
      label={value ? t('list.status.active', 'Active') : t('list.status.inactive', 'Inactive')}
      color={value ? 'success' : 'default'}
      size="small"
      variant={value ? 'filled' : 'outlined'}
    />
  );

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: t('list.columns.name', 'Name'),
      flex: 1.2,
      minWidth: 200,
    },
    {
      field: 'eventPattern',
      headerName: t('list.columns.event_pattern', 'Event Pattern'),
      flex: 1.5,
      minWidth: 200,
    },
    {
      field: 'actionType',
      headerName: t('list.columns.action_type', 'Action Type'),
      flex: 0.9,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<string>) => (
        <Chip
          label={params.value ? actionLabels[params.value] ?? params.value : actionLabels.log}
          size="small"
          color="primary"
          variant="outlined"
        />
      ),
    },
    {
      field: 'isActive',
      headerName: t('list.columns.status', 'Status'),
      flex: 0.7,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams<boolean>) => <StatusChip value={!!params.value} />,
    },
    {
      field: 'priority',
      headerName: t('list.columns.priority', 'Priority'),
      flex: 0.5,
      minWidth: 100,
    },
    {
      field: 'lastExecution',
      headerName: t('list.columns.last_execution', 'Last Execution'),
      flex: 1,
      minWidth: 180,
      valueGetter: (params) =>
        params.value
          ? new Date(params.value).toLocaleString()
          : t('list.last_execution.never', 'Never executed'),
    },
    {
      field: 'actions',
      headerName: t('list.columns.actions', 'Actions'),
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      width: 220,
      renderCell: (params: GridRenderCellParams<number>) => {
        const hookId = params.row.id as number;
        return (
          <Stack direction="row" spacing={1}>
            <Tooltip title={t('list.actions.edit', 'Edit')}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onEdit?.(hookId)}
                >
                  {t('list.actions.edit', 'Edit')}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={t('list.actions.view', 'View Executions')}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onViewExecutions?.(hookId)}
                >
                  {t('list.actions.view', 'View Executions')}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={t('list.actions.delete', 'Delete')}>
              <span>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  onClick={() => onDelete?.(hookId)}
                >
                  {t('list.actions.delete', 'Delete')}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];

  const LoadingOverlay = () => (
    <Box
      data-testid="hooks-grid"
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
        py: 4,
        px: 3,
        gap: 1,
      }}
    >
      <Typography variant="subtitle1">{t('list.empty_title', 'No hooks configured yet')}</Typography>
      <Typography variant="body2" color="textSecondary">
        {t('list.empty_description', 'Create your first hook to automate workflows.')}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ width: '100%' }}>
      <DataGrid
        rows={hooks}
        columns={columns}
        loading={loading}
        autoHeight
        disableSelectionOnClick
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        slots={{
          toolbar: GridToolbar,
          loadingOverlay: LoadingOverlay,
          noRowsOverlay: EmptyOverlay,
        }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 300 },
          },
        }}
        sx={{
          '--DataGrid-rowBorderColor': (theme) => theme.palette.divider,
          '& .MuiDataGrid-columnHeaders': { backgroundColor: 'background.default' },
        }}
      />
    </Box>
  );
};

export default HooksList;
