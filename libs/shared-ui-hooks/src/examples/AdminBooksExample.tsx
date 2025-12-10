import React, { useEffect } from 'react';
import { Box, Typography, List, ListItem, Button, Stack } from '@mui/material';
import { BooksAPI, useBooks } from '../useBooks';
import { Book, BookFormData } from '@my-many-books/shared-types';

interface AdminBooksExampleProps {
  api: BooksAPI<Book, BookFormData>;
}

export const AdminBooksExample: React.FC<AdminBooksExampleProps> = ({ api }) => {
  const {
    books,
    loadBooks,
    loadMore,
    updateBookStatus,
    deleteBook,
  } = useBooks(api, { autoLoad: false, pageSize: 12 });

  useEffect(() => {
    void loadBooks(1);
  }, [loadBooks]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Admin Book Overview
      </Typography>
      <List>
        {books.map(book => (
          <ListItem key={book.id}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
              <Typography sx={{ flexGrow: 1 }}>{book.title}</Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => void updateBookStatus(book.id, 'finished')}
              >
                Mark Done
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => void deleteBook(book.id)}
              >
                Remove
              </Button>
            </Stack>
          </ListItem>
        ))}
      </List>
      <Button
        variant="contained"
        onClick={() => void loadMore()}
        disabled={books.length === 0}
        sx={{ mt: 2 }}
      >
        Load more
      </Button>
    </Box>
  );
};
