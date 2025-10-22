import React from 'react';
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
import {
  Error as ErrorIcon,
  MenuBook as BookIcon
} from '@mui/icons-material';
import { Book, Author, Category } from '../../types';

interface BookSearchResultsProps {
  books: Book[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
  onBookSelect: (book: Book) => void;
}

export const BookSearchResults: React.FC<BookSearchResultsProps> = ({
  books,
  loading,
  error,
  totalCount,
  hasMore,
  onLoadMore,
  onBookSelect
}) => {
  if (error) {
    return (
      <Alert severity="error" sx={{ textAlign: 'center', py: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <ErrorIcon sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            Search Error
          </Typography>
          <Typography variant="body2">{error}</Typography>
        </Box>
      </Alert>
    );
  }

  if (!loading && books.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <BookIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" fontWeight="medium" color="text.primary" gutterBottom>
          No books found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try adjusting your search terms or filters
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Results header */}
      {totalCount > 0 && (
        <Box mb={3}>
          <Typography variant="body2" color="text.secondary">
            Showing {books.length} of {totalCount} book{totalCount !== 1 ? 's' : ''}
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
            {loading ? 'Loading...' : 'Load More Books'}
          </Button>
        </Box>
      )}

      {/* Loading indicator for initial load */}
      {loading && books.length === 0 && (
        <Box textAlign="center" py={6}>
          <CircularProgress size={32} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Searching for books...
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
  const formatAuthors = (authors?: Author[]) => {
    if (!authors || authors.length === 0) return 'Unknown Author';
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
        return 'Reading';
      case 'paused':
        return 'Paused';
      case 'finished':
        return 'Finished';
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
              Edition {book.editionNumber}
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
          <Box mb={1}>
            <Box display="flex" flexWrap="wrap" gap={0.5}>
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
                  +{book.categories.length - 2} more
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