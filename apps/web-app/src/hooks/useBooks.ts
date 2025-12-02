import { useMemo } from 'react';
import {
  useBooks as useSharedBooks,
  BooksAPI,
  UseBooksOptions as SharedUseBooksOptions,
} from '@my-many-books/shared-ui-hooks';
import { useApi } from '../contexts/ApiContext';

export type UseBooksOptions = SharedUseBooksOptions;

export const useBooks = (options: UseBooksOptions = {}) => {
  const { bookAPI } = useApi();

  const api = useMemo<BooksAPI>(() => ({
    getBooks: (page?: number, limit?: number) => bookAPI.getBooks({ page, limit }),
    createBook: data => bookAPI.createBook(data),
    updateBook: (id, data) => bookAPI.updateBook(id, data),
    deleteBook: id => bookAPI.deleteBook(id),
    updateBookStatus: (id, status) => bookAPI.updateBookStatus(id, status),
  }), [bookAPI]);

  return useSharedBooks(api, {
    autoLoad: options.autoLoad,
    pageSize: options.pageSize,
  });
};
