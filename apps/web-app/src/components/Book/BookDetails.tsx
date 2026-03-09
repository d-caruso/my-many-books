import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatEditionDate } from '../../utils/formatEditionDate';
import {
  Paper,
  Box,
  Typography,
  Stack,
  IconButton,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Backdrop
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { SelectChangeEvent } from '@mui/material/Select';
import type { Book, Author, Category } from '@my-many-books/shared-types';
import { getCategoryDisplayName } from '@my-many-books/shared-utils';

interface BookDetailsProps {
  book: Book;
  onEdit?: (book: Book) => void;
  onDelete?: (bookId: number) => void;
  onStatusChange?: (bookId: number, status: Book['status']) => void;
  onClose?: () => void;
  loading?: boolean;
}

export const BookDetails: React.FC<BookDetailsProps> = ({
  book,
  onEdit,
  onDelete,
  onStatusChange,
  onClose,
  loading = false
}) => {
  const { t } = useTranslation(['books', 'common']);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const formatAuthors = (authors?: Author[]) => {
    if (!authors || authors.length === 0) return t('books:unknown_author');
    return authors.map(author =>
      typeof author === 'string' ? author : `${author.name} ${author.surname}`
    ).join(', ');
  };
  const authorPrefix = t('books:by_author_prefix', { defaultValue: 'by' });

  const getStatusColor = (status: string): 'success' | 'primary' | 'warning' | 'default' => {
    switch (status) {
      case 'finished':
        return 'success';
      case 'reading':
        return 'primary';
      case 'paused':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'reading':
        return t('books:reading');
      case 'paused':
        return t('books:paused');
      case 'finished':
        return t('books:finished');
      default:
        return ' ';
    }
  };

  const handleStatusChange = async (e: SelectChangeEvent) => {
    if (onStatusChange) {
      const value = e.target.value;
      const status = value === '' ? null : (value as Book['status']);
      setStatusSaving(true);
      try {
        await (onStatusChange(book.id, status) as unknown as Promise<void>);
      } finally {
        setStatusSaving(false);
      }
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(book.id);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Backdrop open={statusSaving} sx={{ zIndex: (theme) => theme.zIndex.modal + 1, color: '#fff' }}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden', maxWidth: 600, mx: 'auto' }}>
        <Box
          sx={{
            px: 4,
            py: 3,
            bgcolor: 'primary.50',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Typography variant="h6">{t('books:book_details')}</Typography>
          <Stack direction="row" spacing={1}>
            {onEdit && (
              <IconButton aria-label={t('books:edit_book_title')} onClick={() => onEdit(book)} disabled={loading}>
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            {onDelete && (
              <IconButton
                aria-label={t('books:delete_book_title')}
                color="error"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
            {onClose && (
              <IconButton aria-label={t('common:close')} onClick={onClose}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </Box>

        <Box sx={{ p: 4 }}>
          <Grid container spacing={4}>
            {/* Book cover placeholder — hidden until real covers are supported
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  aspectRatio: '3/4',
                  bgcolor: 'grey.100',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.disabled',
                }}
              >
                <MenuBookIcon sx={{ fontSize: 72 }} />
              </Box>
            </Grid>
            */}

            <Grid item xs={12} md={8}>
              <Stack spacing={3} sx={{ width: '100%' }}>
                <Box>
                  <Typography variant="h4" gutterBottom>
                    {book.title}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    {authorPrefix} {formatAuthors(book.authors)}
                  </Typography>
                  {book.status && (
                    <Chip
                      label={formatStatus(book.status)}
                      color={getStatusColor(book.status)}
                      sx={{ width: 'fit-content' }}
                    />
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      {t('books:isbn')}
                    </Typography>
                    <Typography variant="body1" fontFamily="monospace">
                      {book.isbnCode || 'N/A'}
                    </Typography>
                  </Grid>
                  {book.editionNumber && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        {t('books:edition')}
                      </Typography>
                      <Typography variant="body1">{book.editionNumber}</Typography>
                    </Grid>
                  )}
                  {book.editionDate && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        {t('books:edition_date')}
                      </Typography>
                      <Typography variant="body1">{formatEditionDate(book.editionDate)}</Typography>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      {t('books:added')}
                    </Typography>
                    <Typography variant="body1">{formatDate(book.creationDate)}</Typography>
                  </Grid>
                  {book.updateDate !== book.creationDate && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        {t('books:last_updated')}
                      </Typography>
                      <Typography variant="body1">{formatDate(book.updateDate)}</Typography>
                    </Grid>
                  )}
                </Grid>

<Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="flex-start">
                  {onStatusChange && (
                    <Box sx={{ minWidth: 200 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {t('books:update_reading_status')}
                      </Typography>
                      <FormControl size="small" sx={{ width: 200 }}>
                        <InputLabel id={`status-${book.id}`}>{t('books:status')}</InputLabel>
                        <Select
                          labelId={`status-${book.id}`}
                          value={book.status || ''}
                          label={t('books:status')}
                          onChange={handleStatusChange}
                          disabled={statusSaving}
                        >
                          <MenuItem value="">{'\u00A0'}</MenuItem>
                          <MenuItem value="reading">{t('books:reading')}</MenuItem>
                          <MenuItem value="paused">{t('books:paused')}</MenuItem>
                          <MenuItem value="finished">{t('books:finished')}</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  {book.categories && book.categories.length > 0 && (
                    <Box flex={1}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {t('books:categories')}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {book.categories.map((category: Category) => (
                          <Chip
                            key={category.id}
                            label={getCategoryDisplayName(category, t)}
                            variant="outlined"
                            size="medium"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>

                {book.notes && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('books:notes')}
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                      <Typography whiteSpace="pre-wrap" sx={{ wordBreak: 'break-word' }}>
                        {book.notes}
                      </Typography>
                    </Paper>
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="error" />
          {t('books:delete_book')}
        </DialogTitle>
        <DialogContent dividers>
          <Typography color="text.secondary">
            {t('books:delete_confirm_message', { title: book.title })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)} disabled={loading}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
            {loading ? t('books:deleting') : t('books:delete_book')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
