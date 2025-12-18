import { useMemo } from 'react';
import { useBookSearch as useSharedBookSearch, BookSearchAPI } from '@my-many-books/shared-ui-hooks';
import { useApi } from '../contexts/ApiContext';
export const useBookSearch = () => {
  const { bookAPI } = useApi();

  const api = useMemo<BookSearchAPI>(() => ({
    searchBooks: params => bookAPI.searchBooks(params),
    searchByISBN: isbn => bookAPI.searchByISBN(isbn),
  }), [bookAPI]);

  return useSharedBookSearch(api);
};
