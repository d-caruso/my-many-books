/**
 * Shared book search hook - works on web and mobile
 */

import { useState, useCallback } from 'react';
import { Book, SearchFilters, SearchFiltersSchema, SearchResult } from '@my-many-books/shared-types';

export interface BookSearchState<TBook extends Book = Book> {
  books: TBook[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
}

export interface BookSearchActions<TBook extends Book = Book, TFilters extends SearchFilters = SearchFilters> {
  searchBooks: (query: string, filters?: Partial<TFilters>, page?: number) => Promise<void>;
  searchByISBN: (isbn: string) => Promise<TBook | null>;
  clearSearch: () => void;
  loadMore: () => Promise<void>;
}

export type BookSearchResult<TBook extends Book = Book> = Omit<SearchResult, 'books'> & {
  books: TBook[];
};

type BookSearchQuery<TFilters extends SearchFilters> = Partial<TFilters> & {
  q?: string;
  page?: number;
  limit?: number;
};

export interface BookSearchAPI<TBook extends Book = Book, TFilters extends SearchFilters = SearchFilters> {
  searchBooks: (params: BookSearchQuery<TFilters>) => Promise<BookSearchResult<TBook>>;
  searchByISBN: (isbn: string) => Promise<TBook | null>;
}

export interface BookSearchOptions {
  pageSize?: number;
}

const hasActiveFilters = (filters?: Record<string, unknown>): boolean => {
  if (!filters) {
    return false;
  }
  return Object.values(filters).some(value => value !== undefined && value !== null && value !== '');
};

export const useBookSearch = <TBook extends Book = Book, TFilters extends SearchFilters = SearchFilters>(
  api: BookSearchAPI<TBook, TFilters>,
  options: BookSearchOptions = {}
): BookSearchState<TBook> & BookSearchActions<TBook, TFilters> => {
  const pageSize = options.pageSize ?? 20;

  const [books, setBooks] = useState<TBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastQuery, setLastQuery] = useState<string>('');
  const [lastFilters, setLastFilters] = useState<Partial<TFilters>>({});

  const searchBooks = useCallback(
    async (query: string, filters: Partial<TFilters> = {}, page: number = 1): Promise<void> => {
      const trimmedQuery = query.trim();
      const parsedQuery = SearchFiltersSchema.shape.query.safeParse(trimmedQuery);
      const validQuery = parsedQuery.success ? parsedQuery.data : undefined;

      if (!validQuery && !hasActiveFilters(filters)) {
        clearSearch();
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const searchParams: BookSearchQuery<TFilters> = {
          page,
          limit: pageSize,
          ...filters,
        };
        if (validQuery) {
          searchParams.q = validQuery;
        }

        const response = await api.searchBooks(searchParams);

        if (page === 1) {
          setBooks(response.books);
        } else {
          setBooks(prev => [...prev, ...response.books]);
        }

        setTotalCount(response.total);
        setHasMore(response.hasMore);
        setCurrentPage(page);
        setLastQuery(query);
        setLastFilters(filters);
      } catch (err: any) {
        console.error('Book search failed:', err);
        const isTechnicalError = Array.isArray(err?.issues) || err?.name === 'ZodError';
        setError(
          isTechnicalError
            ? 'SEARCH_UNEXPECTED_ERROR'
            : err.response?.data?.message || err.message || 'SEARCH_UNEXPECTED_ERROR'
        );

        if (page === 1) {
          setBooks([]);
          setTotalCount(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [api, pageSize]
  );

  const searchByISBN = useCallback(async (isbn: string): Promise<TBook | null> => {
    if (!isbn.trim()) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.searchByISBN(isbn);
      return result;
    } catch (err: any) {
      console.error('ISBN search failed:', err);
      const isTechnicalError = Array.isArray(err?.issues) || err?.name === 'ZodError';
      setError(
        isTechnicalError
          ? 'SEARCH_UNEXPECTED_ERROR'
          : err.response?.data?.message || err.message || 'SEARCH_UNEXPECTED_ERROR'
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || loading) {
      return;
    }

    await searchBooks(lastQuery, lastFilters, currentPage + 1);
  }, [hasMore, loading, lastQuery, lastFilters, currentPage, searchBooks]);

  const clearSearch = useCallback((): void => {
    setBooks([]);
    setLoading(false);
    setError(null);
    setHasMore(false);
    setTotalCount(0);
    setCurrentPage(1);
    setLastQuery('');
    setLastFilters({});
  }, []);

  return {
    books,
    loading,
    error,
    hasMore,
    totalCount,
    currentPage,
    searchBooks,
    searchByISBN,
    clearSearch,
    loadMore
  };
};
