import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  CircularProgress,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridPaginationModel,
} from '@mui/x-data-grid';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from './AdminLayout';
import { useApi } from '../../contexts/ApiContext';

interface User {
  id: number;
  email: string;
  name: string;
  surname: string;
  fullName: string;
  isActive: boolean;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  name: string;
  surname: string;
  email: string;
  isActive: boolean;
  role: 'user' | 'admin';
}

export const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { apiService } = useApi();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    surname: '',
    email: '',
    isActive: true,
    role: 'user',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getAdminUsers(
        paginationModel.page + 1,
        paginationModel.pageSize,
        searchTerm || undefined
      );

      setUsers(response.users);
      setTotalRows(response.pagination.total);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [paginationModel, searchTerm]);

  const handleSearch = () => {
    setPaginationModel({ ...paginationModel, page: 0 });
    fetchUsers();
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      surname: user.surname,
      email: user.email,
      isActive: user.isActive,
      role: user.role,
    });
    setFormError(null);
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
    setFormError(null);
  };

  const handleEditSubmit = async () => {
    if (!selectedUser) return;

    try {
      setFormLoading(true);
      setFormError(null);

      await apiService.updateAdminUser(selectedUser.id, formData);

      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to update user:', err);
      setFormError(err.message || 'Failed to update user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setDeleteLoading(true);

      await apiService.deleteAdminUser(userToDelete.id);

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      setError(err.message || 'Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'fullName', headerName: t('pages:admin.users.name', 'Name'), width: 200 },
    { field: 'email', headerName: t('pages:admin.users.email', 'Email'), width: 250 },
    {
      field: 'role',
      headerName: t('pages:admin.users.role', 'Role'),
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          color={params.value === 'admin' ? 'secondary' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'isActive',
      headerName: t('pages:admin.users.status', 'Status'),
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? t('pages:admin.users.active', 'Active') : t('pages:admin.users.inactive', 'Inactive')}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: t('pages:admin.users.created', 'Created'),
      width: 180,
      valueFormatter: (params) => new Date(params).toLocaleString(),
    },
    {
      field: 'actions',
      headerName: t('pages:admin.users.actions', 'Actions'),
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleEditClick(params.row as User)}
            aria-label={t('pages:admin.users.edit', 'Edit user')}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteClick(params.row as User)}
            aria-label={t('pages:admin.users.delete', 'Delete user')}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          {t('pages:admin.users.title', 'User Management')}
        </Typography>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Search Bar */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <TextField
            placeholder={t('pages:admin.users.search_placeholder', 'Search by name or email...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            fullWidth
            size="small"
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
          >
            {t('pages:admin.users.search', 'Search')}
          </Button>
        </Box>

        {/* Data Grid */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={users}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[5, 10, 25, 50]}
            rowCount={totalRows}
            paginationMode="server"
            loading={loading}
            disableRowSelectionOnClick
          />
        </Box>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            {t('pages:admin.users.edit_user', 'Edit User')}
          </DialogTitle>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label={t('pages:admin.users.first_name', 'First Name')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label={t('pages:admin.users.last_name', 'Last Name')}
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label={t('pages:admin.users.email', 'Email')}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
                required
                type="email"
              />
              <FormControl fullWidth>
                <InputLabel>{t('pages:admin.users.role', 'Role')}</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'user' | 'admin' })}
                  label={t('pages:admin.users.role', 'Role')}
                >
                  <MenuItem value="user">{t('pages:admin.users.role_user', 'User')}</MenuItem>
                  <MenuItem value="admin">{t('pages:admin.users.role_admin', 'Admin')}</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label={t('pages:admin.users.active', 'Active')}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditClose} disabled={formLoading}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleEditSubmit}
              variant="contained"
              disabled={formLoading || !formData.name || !formData.surname || !formData.email}
            >
              {formLoading ? <CircularProgress size={24} /> : t('common:save', 'Save')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={handleDeleteClose}>
          <DialogTitle>
            {t('pages:admin.users.delete_confirmation_title', 'Delete User')}
          </DialogTitle>
          <DialogContent>
            <Typography>
              {t(
                'pages:admin.users.delete_confirmation_message',
                'Are you sure you want to delete user {{name}}? This action cannot be undone.',
                { name: userToDelete?.fullName }
              )}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteClose} disabled={deleteLoading}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              disabled={deleteLoading}
            >
              {deleteLoading ? <CircularProgress size={24} /> : t('common:delete', 'Delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};
