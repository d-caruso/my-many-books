import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import BookIcon from '@mui/icons-material/MenuBook';
import AddIcon from '@mui/icons-material/Add';
import PushPinIcon from '@mui/icons-material/PushPin';
import type { Book, Author, Category } from '@my-many-books/shared-types';
import { getCategoryDisplayName } from '@my-many-books/shared-utils';
import { formatEditionDate } from '@my-many-books/shared-forms';

interface BookSearchResultsProps {
  books: Book[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
  onBookSelect: (book: Book) => void;
  scannedIsbn?: string;
}

export const BookSearchResults: React.FC<BookSearchResultsProps> = ({
  books,
  loading,
  error,
  totalCount,
  hasMore,
  onLoadMore,
  onBookSelect,
  scannedIsbn
}) => {
  const { t } = useTranslation(['books', 'common']);
  const navigate = useNavigate();

  if (error) {
    const errorKey = `books:errors.${error}`;
    const displayError = t(errorKey, { defaultValue: '' }) || t('books:errors.SEARCH_UNEXPECTED_ERROR');

    return (
      <Alert severity="error" sx={{ textAlign: 'center', py: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <ErrorIcon sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            {t('books:search_error')}
          </Typography>
          <Typography variant="body2">{displayError}</Typography>
        </Box>
      </Alert>
    );
  }

  if (!loading && books.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <BookIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" fontWeight="medium" color="text.primary" gutterBottom>
          {t('books:no_books_found')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('books:try_adjusting')}
        </Typography>
        {scannedIsbn && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate(`/?mode=add&isbn=${encodeURIComponent(scannedIsbn)}`)}
            sx={{ mt: 3 }}
          >
            {t('books:add_new_book')}
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {/* Results header */}
      {totalCount > 0 && (
        <Box mb={3}>
          <Typography variant="body2" color="text.secondary">
            {t('books:showing_results', { current: books.length, total: totalCount, count: totalCount })}
          </Typography>
        </Box>
      )}

      {/* Book grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)'
          },
          gap: 3,
          mb: 3
        }}
      >
        {books.map((book) => (
          <BookCard 
            key={book.id}
            book={book} 
            onClick={() => onBookSelect(book)} 
          />
        ))}
      </Box>

      {/* Load more button */}
      {hasMore && (
        <Box textAlign="center" mb={3}>
          <Button
            onClick={onLoadMore}
            disabled={loading}
            variant="contained"
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? t('common:loading') : t('books:load_more_books')}
          </Button>
        </Box>
      )}

      {/* Loading indicator for initial load */}
      {loading && books.length === 0 && (
        <Box textAlign="center" py={6}>
          <CircularProgress size={32} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            {t('books:searching_for_books')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

interface BookCardProps {
  book: Book;
  onClick: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  const { t } = useTranslation(['books', 'common', 'search']);

  const formatAuthors = (authors?: Author[]) => {
    if (!authors || authors.length === 0) return t('books:unknown_author');
    return authors.map(author =>
      typeof author === 'string' ? author : `${author.name} ${author.surname}`
    ).join(', ');
  };

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
        return status;
    }
  };

  return (
    <Card 
      onClick={onClick}
      sx={{ 
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: 2
        }
      }}
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
        >
          <BookIcon sx={{ fontSize: 48 }} />
        </CardMedia>
        
        {/* Badges container */}
        <Box position="absolute" top={8} right={8} display="flex" flexDirection="column" gap={0.5}>
          {/* Pinned badge */}
          {(book as Book & { isPinned?: boolean }).isPinned && (
            <Chip
              label={t('search:pinned.badge')}
              size="small"
              color="secondary"
              icon={<PushPinIcon />}
              sx={{ fontWeight: 'bold' }}
            />
          )}

          {/* Status badge */}
          {book.status && (
            <Chip
              label={formatStatus(book.status)}
              size="small"
              color={getStatusColor(book.status)}
            />
          )}
        </Box>
      </Box>

      {/* Book details */}
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Typography 
          variant="subtitle2" 
          fontWeight="600"
          gutterBottom
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
          title={book.title}
        >
          {book.title}
        </Typography>
        
        <Typography 
          variant="body2" 
          color="text.secondary"
          gutterBottom
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
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
              {formatEditionDate(book.editionDate)}
            </Typography>
          )}
        </Box>

        {/* Categories */}
        {book.categories && book.categories.length > 0 && (
          <Box mb={1}>
            <Box display="flex" flexWrap="wrap" gap={0.5}>
              {book.categories.slice(0, 2).map((category: Category) => (
                <Chip
                  key={category.id}
                  label={getCategoryDisplayName(category, t)}
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
            </Box>
          </Box>
        )}

        {/* ISBN */}
        {book.isbnCode && (
          <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
            ISBN: {book.isbnCode}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
