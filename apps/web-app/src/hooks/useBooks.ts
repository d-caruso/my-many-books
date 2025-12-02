import { useMemo } from 'react';
import { useBooks as useSharedBooks, BooksAPI } from '@my-many-books/shared-ui-hooks';
import { useApi } from '../contexts/ApiContext';

interface UseBooksOptions {
  autoLoad?: boolean;
}

export const useBooks = (options: UseBooksOptions = {}) => {
  const { bookAPI } = useApi();

  const api = useMemo<BooksAPI>(() => ({
    getBooks: (page?: number, limit?: number) => bookAPI.getBooks({ page, limit }),
    createBook: data => bookAPI.createBook(data),
    updateBook: (id, data) => bookAPI.updateBook(id, data),
    deleteBook: id => bookAPI.deleteBook(id),
    updateBookStatus: (id, status) => bookAPI.updateBookStatus(id, status),
  }), [bookAPI]);

  return useSharedBooks(api, options.autoLoad ?? true);
};
