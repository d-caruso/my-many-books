import React from 'react';
import {
  Box,
  Button,
  Stack,
  Chip,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridToolbar } from '@mui/x-data-grid';
import { AdminHookSummary } from '../../../services/api';

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
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1.2,
      minWidth: 200,
    },
    {
      field: 'eventPattern',
      headerName: 'Event Pattern',
      flex: 1.5,
      minWidth: 200,
    },
    {
      field: 'actionType',
      headerName: 'Action Type',
      flex: 0.9,
      minWidth: 150,
    },
    {
      field: 'isActive',
      headerName: 'Status',
      flex: 0.7,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams<boolean>) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'primary' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'priority',
      headerName: 'Priority',
      flex: 0.5,
      minWidth: 100,
    },
    {
      field: 'lastExecution',
      headerName: 'Last Execution',
      flex: 1,
      minWidth: 180,
      valueGetter: (params) => params.value
        ? new Date(params.value).toLocaleString()
        : 'Never executed',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      width: 220,
      renderCell: (params: GridRenderCellParams<number>) => {
        const hookId = params.row.id as number;
        return (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onEdit?.(hookId)}
            >
              Edit
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onViewExecutions?.(hookId)}
            >
              View Executions
            </Button>
            <Button
              size="small"
              variant="contained"
              color="error"
              onClick={() => onDelete?.(hookId)}
            >
              Delete
            </Button>
          </Stack>
        );
      },
    },
  ];

  return (
    <Box
      data-testid="hooks-grid"
      sx={{
        height: 480,
        width: '100%',
      }}
    >
      <DataGrid
        rows={hooks}
        columns={columns}
        loading={loading}
        autoHeight
        autoPageSize
        disableSelectionOnClick
        components={{
          Toolbar: GridToolbar,
        }}
        componentsProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 300 },
          },
        }}
      />
    </Box>
  );
};

export default HooksList;
