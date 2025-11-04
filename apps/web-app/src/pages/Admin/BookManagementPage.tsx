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

interface Book {
  id: number;
  title: string;
  isbnCode: string;
  editionNumber?: number;
  editionDate?: string;
  status?: 'reading' | 'paused' | 'finished' | null;
  notes?: string;
  userId?: number | null;
  userName?: string | null;
  authors: Array<{ id: number; name: string; surname: string; fullName: string }>;
  categories: Array<{ id: number; name: string }>;
  createdAt: string;
  updatedAt: string;
}

interface BookFormData {
  title: string;
  isbnCode: string;
  editionNumber?: number;
  editionDate?: string;
  status?: 'reading' | 'paused' | 'finished' | null;
  notes?: string;
  userId?: number | null;
}

export const BookManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { apiService } = useApi();

  const [books, setBooks] = useState<Book[]>([]);
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
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState<BookFormData>({
    title: '',
    isbnCode: '',
    status: null,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getAdminBooks(
        paginationModel.page + 1,
        paginationModel.pageSize,
        searchTerm || undefined
      );

      setBooks(response.books);
      setTotalRows(response.pagination.total);
    } catch (err: any) {
      console.error('Failed to fetch books:', err);
      setError(err.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [paginationModel, searchTerm]);

  const handleSearch = () => {
    setPaginationModel({ ...paginationModel, page: 0 });
    fetchBooks();
  };

  const handleEditClick = (book: Book) => {
    setSelectedBook(book);
    setFormData({
      title: book.title,
      isbnCode: book.isbnCode,
      editionNumber: book.editionNumber,
      editionDate: book.editionDate,
      status: book.status || null,
      notes: book.notes,
      userId: book.userId,
    });
    setFormError(null);
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setSelectedBook(null);
    setFormError(null);
  };

  const handleEditSubmit = async () => {
    if (!selectedBook) return;

    try {
      setFormLoading(true);
      setFormError(null);

      await apiService.updateAdminBook(selectedBook.id, formData);

      setEditDialogOpen(false);
      setSelectedBook(null);
      fetchBooks();
    } catch (err: any) {
      console.error('Failed to update book:', err);
      setFormError(err.message || 'Failed to update book');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (book: Book) => {
    setBookToDelete(book);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setBookToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!bookToDelete) return;

    try {
      setDeleteLoading(true);

      await apiService.deleteAdminBook(bookToDelete.id);

      setDeleteDialogOpen(false);
      setBookToDelete(null);
      fetchBooks();
    } catch (err: any) {
      console.error('Failed to delete book:', err);
      setError(err.message || 'Failed to delete book');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'title', headerName: t('pages:admin.books.title', 'Title'), width: 250 },
    { field: 'isbnCode', headerName: t('pages:admin.books.isbn', 'ISBN'), width: 150 },
    {
      field: 'authors',
      headerName: t('pages:admin.books.authors', 'Authors'),
      width: 200,
      valueGetter: (params) => params.map((a: any) => a.fullName).join(', '),
    },
    {
      field: 'userName',
      headerName: t('pages:admin.books.user', 'User'),
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        params.value ? <Typography variant="body2">{params.value}</Typography> : <Typography variant="body2" color="textSecondary">-</Typography>
      ),
    },
    {
      field: 'status',
      headerName: t('pages:admin.books.status', 'Status'),
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        if (!params.value) return <Chip label="N/A" size="small" />;
        const colorMap: any = { reading: 'primary', paused: 'warning', finished: 'success' };
        return <Chip label={params.value} color={colorMap[params.value] || 'default'} size="small" />;
      },
    },
    {
      field: 'createdAt',
      headerName: t('pages:admin.books.created', 'Created'),
      width: 180,
      valueFormatter: (params) => new Date(params).toLocaleString(),
    },
    {
      field: 'actions',
      headerName: t('pages:admin.books.actions', 'Actions'),
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleEditClick(params.row as Book)}
            aria-label={t('pages:admin.books.edit', 'Edit book')}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteClick(params.row as Book)}
            aria-label={t('pages:admin.books.delete', 'Delete book')}
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
          {t('pages:admin.books.page_title', 'Book Management')}
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
            placeholder={t('pages:admin.books.search_placeholder', 'Search by title, ISBN, or author...')}
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
            {t('pages:admin.books.search', 'Search')}
          </Button>
        </Box>

        {/* Data Grid */}
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={books}
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
            {t('pages:admin.books.edit_book', 'Edit Book')}
          </DialogTitle>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label={t('pages:admin.books.title', 'Title')}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label={t('pages:admin.books.isbn', 'ISBN')}
                value={formData.isbnCode}
                onChange={(e) => setFormData({ ...formData, isbnCode: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label={t('pages:admin.books.edition_number', 'Edition Number')}
                value={formData.editionNumber || ''}
                onChange={(e) => setFormData({ ...formData, editionNumber: e.target.value ? parseInt(e.target.value) : undefined })}
                fullWidth
                type="number"
              />
              <TextField
                label={t('pages:admin.books.edition_date', 'Edition Date')}
                value={formData.editionDate || ''}
                onChange={(e) => setFormData({ ...formData, editionDate: e.target.value })}
                fullWidth
                type="date"
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth>
                <InputLabel>{t('pages:admin.books.status', 'Status')}</InputLabel>
                <Select
                  value={formData.status || ''}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any || null })}
                  label={t('pages:admin.books.status', 'Status')}
                >
                  <MenuItem value="">{t('pages:admin.books.no_status', 'None')}</MenuItem>
                  <MenuItem value="reading">{t('pages:admin.books.reading', 'Reading')}</MenuItem>
                  <MenuItem value="paused">{t('pages:admin.books.paused', 'Paused')}</MenuItem>
                  <MenuItem value="finished">{t('pages:admin.books.finished', 'Finished')}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={t('pages:admin.books.notes', 'Notes')}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                fullWidth
                multiline
                rows={3}
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
              disabled={formLoading || !formData.title || !formData.isbnCode}
            >
              {formLoading ? <CircularProgress size={24} /> : t('common:save', 'Save')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={handleDeleteClose}>
          <DialogTitle>
            {t('pages:admin.books.delete_confirmation_title', 'Delete Book')}
          </DialogTitle>
          <DialogContent>
            <Typography>
              {t(
                'pages:admin.books.delete_confirmation_message',
                'Are you sure you want to delete "{{title}}"? This action cannot be undone.',
                { title: bookToDelete?.title }
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
