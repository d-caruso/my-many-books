import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Typography,
  Chip,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  Box,
  Stack
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MenuBook as BookIcon
} from '@mui/icons-material';
import { Book, Author, Category } from '../../types';

interface BookCardProps {
  book: Book;
  onEdit?: (book: Book) => void;
  onDelete?: (bookId: number) => void;
  onStatusChange?: (bookId: number, status: Book['status']) => void;
  onClick?: (book: Book) => void;
  showActions?: boolean;
  compact?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onEdit,
  onDelete,
  onStatusChange,
  onClick,
  showActions = true,
  compact = false
}) => {
  const { t } = useTranslation(['books', 'common']);

  const formatAuthors = (authors?: Author[]) => {
    if (!authors || authors.length === 0) return t('books:unknown_author');
    return authors.map(author =>
      typeof author === 'string' ? author : `${author.name} ${author.surname}`
    ).join(', ');
  };

  const getStatusColor = (status: string) => {
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
        return status;
    }
  };

  const handleStatusChange = (event: any) => {
    if (onStatusChange) {
      const value = event.target.value;
      const status = value === '' ? null : (value as Book['status']);
      onStatusChange(book.id, status as any);
    }
  };

  if (compact) {
    return (
      <Card 
        sx={{ 
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': {
            boxShadow: 2
          }
        }}
        onClick={() => onClick?.(book)}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1} minWidth={0}>
              <Typography
                variant="subtitle2"
                component="h2"
                fontWeight="600"
                noWrap
                title={book.title}
              >
                {book.title}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                noWrap
                title={formatAuthors(book.authors)}
              >
                {formatAuthors(book.authors)}
              </Typography>
              {book.status && (
                <Chip
                  label={formatStatus(book.status)}
                  size="small"
                  color={getStatusColor(book.status) as any}
                  sx={{ mt: 0.5, height: 20 }}
                />
              )}
            </Box>
            
            {showActions && (
              <Stack direction="row" spacing={0.5} ml={1}>
                {onEdit && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(book);
                    }}
                    title={t('books:edit_book_title')}
                    aria-label={t('books:edit_book_title')}
                  >
                    <EditIcon fontSize="small" aria-hidden="true" />
                  </IconButton>
                )}

                {onDelete && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(t('books:delete_confirm', { title: book.title }))) {
                        onDelete(book.id);
                      }
                    }}
                    title={t('books:delete_book_title')}
                    aria-label={t('books:delete_book_title')}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" aria-hidden="true" />
                  </IconButton>
                )}
              </Stack>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': {
          boxShadow: 2
        },
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
      onClick={() => onClick?.(book)}
    >
      {/* Book cover */}
      <Box position="relative">
        <CardMedia
          sx={{
            height: 200,
            bgcolor: 'grey.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'grey.500'
          }}
          role="img"
          aria-label={t('books:book_cover_placeholder')}
        >
          <BookIcon sx={{ fontSize: 48 }} aria-hidden="true" />
        </CardMedia>
        
        {/* Status badge */}
        {book.status && (
          <Box position="absolute" top={8} right={8}>
            <Chip
              label={formatStatus(book.status)}
              size="small"
              color={getStatusColor(book.status) as any}
            />
          </Box>
        )}

        {/* Actions overlay */}
        {showActions && (
          <Box 
            position="absolute" 
            top={8} 
            left={8}
            sx={{
              opacity: 0,
              '&:hover': { opacity: 1 },
              transition: 'opacity 0.2s'
            }}
          >
            <Stack direction="row" spacing={0.5}>
              {onEdit && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(book);
                  }}
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.7)'
                    }
                  }}
                  title={t('books:edit_book_title')}
                  aria-label={t('books:edit_book_title')}
                >
                  <EditIcon fontSize="small" aria-hidden="true" />
                </IconButton>
              )}

              {onDelete && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(t('books:delete_confirm', { title: book.title }))) {
                      onDelete(book.id);
                    }
                  }}
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'error.main'
                    }
                  }}
                  title={t('books:delete_book_title')}
                  aria-label={t('books:delete_book_title')}
                >
                  <DeleteIcon fontSize="small" aria-hidden="true" />
                </IconButton>
              )}
            </Stack>
          </Box>
        )}
      </Box>

      <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 2.5 } }}>
        <Typography
          variant="subtitle2"
          component="h2"
          fontWeight="600"
          gutterBottom
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
          title={book.title}
        >
          {book.title}
        </Typography>
        
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 1,
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }}
          title={formatAuthors(book.authors)}
        >
          {formatAuthors(book.authors)}
        </Typography>

        {/* Edition info */}
        <Box display="flex" justifyContent="space-between" mb={1}>
          {book.editionNumber && (
            <Typography variant="caption" color="text.disabled">
              {t('books:edition')} {book.editionNumber}
            </Typography>
          )}
          {book.editionDate && (
            <Typography variant="caption" color="text.disabled">
              {new Date(book.editionDate).getFullYear()}
            </Typography>
          )}
        </Box>

        {/* Categories */}
        {book.categories && book.categories.length > 0 && (
          <Box mb={2}>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {book.categories.slice(0, 2).map((category: Category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              ))}
              {book.categories.length > 2 && (
                <Typography variant="caption" color="text.disabled">
                  +{book.categories.length - 2} {t('books:more')}
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        {/* Notes preview */}
        {book.notes && (
          <Typography 
            variant="caption" 
            color="text.disabled"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mb: 1
            }}
            title={book.notes}
          >
            {book.notes}
          </Typography>
        )}

        {/* ISBN */}
        {book.isbnCode && (
          <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
            ISBN: {book.isbnCode}
          </Typography>
        )}
      </CardContent>

      {/* Status change and actions */}
      {(onStatusChange || showActions) && (
        <CardActions sx={{ pt: 0, px: { xs: 2, sm: 2.5 }, pb: { xs: 2, sm: 2.5 } }}>
          {onStatusChange && (
            <FormControl size="small" sx={{ minWidth: 120, flexGrow: 1 }}>
              <Select
                value={book.status || ''}
                onChange={handleStatusChange}
                onClick={(e) => e.stopPropagation()}
                sx={{ fontSize: '0.875rem' }}
                aria-label={t('accessibility:change_reading_status')}
              >
                <MenuItem value="">&nbsp;</MenuItem>
                <MenuItem value="reading">{t('books:reading')}</MenuItem>
                <MenuItem value="paused">{t('books:paused')}</MenuItem>
                <MenuItem value="finished">{t('books:finished')}</MenuItem>
              </Select>
            </FormControl>
          )}
        </CardActions>
      )}
    </Card>
  );
};