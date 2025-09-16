import React from 'react';
import {
  Box,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  Warning as WarningIcon,
  MenuBook as BookIcon
} from '@mui/icons-material';
import { Book } from '../../types';
import { BookCard } from './BookCard';

interface BookListProps {
  books: Book[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onEdit?: (book: Book) => void;
  onDelete?: (bookId: number) => void;
  onStatusChange?: (bookId: number, status: Book['status']) => void;
  onBookClick?: (book: Book) => void;
  viewMode?: 'grid' | 'list';
  showActions?: boolean;
}

export const BookList: React.FC<BookListProps> = ({
  books,
  loading = false,
  error = null,
  emptyMessage = 'No books found',
  onEdit,
  onDelete,
  onStatusChange,
  onBookClick,
  viewMode = 'grid',
  showActions = true
}) => {
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" py={6}>
        <CircularProgress size={32} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Loading books...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ textAlign: 'center', py: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <WarningIcon sx={{ fontSize: 32, mb: 1 }} />
          <AlertTitle>Error Loading Books</AlertTitle>
          {error}
        </Box>
      </Alert>
    );
  }

  if (books.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" py={6}>
        <BookIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.primary" gutterBottom>
          {emptyMessage}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Start building your library by adding your first book
        </Typography>
      </Box>
    );
  }

  if (viewMode === 'list') {
    return (
      <Stack spacing={2}>
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onClick={onBookClick}
            showActions={showActions}
            compact={true}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
          xl: 'repeat(5, 1fr)'
        },
        gap: { xs: 2, sm: 3 }
      }}
    >
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
          onClick={onBookClick}
          showActions={showActions}
          compact={false}
        />
      ))}
    </Box>
  );
};