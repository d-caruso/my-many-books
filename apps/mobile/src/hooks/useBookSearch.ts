import { useState, useCallback, useRef } from 'react';
import { Book, SearchQuery } from '@/types';
import { bookAPI } from '@/services/api';
import { bookRepository } from '@/services/database/BookRepository';
import { useNetworkState } from './useNetworkState';
import { useTranslation } from 'react-i18next';
import { mobileHooks, MOBILE_EVENTS, RESOURCE_TYPES } from '@/services/hooks/mobileHooks';
import {
  SEARCH_SORT_BY_FIELDS,
  SORT_DIRECTIONS,
} from '@my-many-books/shared-types';
import { DB_SORT_FIELDS } from '@/constants/db';

type OfflineSortField =
  | typeof DB_SORT_FIELDS[keyof typeof DB_SORT_FIELDS]
  | 'status';

const mapSortByToOfflineField = (
  sortBy?: SearchQuery['sortBy']
): OfflineSortField => {
  switch (sortBy) {
    case SEARCH_SORT_BY_FIELDS.TITLE:
      return DB_SORT_FIELDS.TITLE;
    case SEARCH_SORT_BY_FIELDS.STATUS:
      return 'status';
    case SEARCH_SORT_BY_FIELDS.CREATED_AT:
      return DB_SORT_FIELDS.CREATION_DATE;
    case SEARCH_SORT_BY_FIELDS.UPDATED_AT:
    case undefined:
      return DB_SORT_FIELDS.UPDATE_DATE;
    case SEARCH_SORT_BY_FIELDS.AUTHOR:
      throw new Error('Offline author sorting is not supported yet');
  }
};

interface BookSearchState {
  books: Book[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  isOffline: boolean;
}

interface BookSearchActions {
  searchBooks: (query: string, filters?: Partial<SearchQuery>, page?: number) => Promise<void>;
  searchByISBN: (isbn: string) => Promise<Book | null>;
  clearSearch: () => void;
  loadMore: () => Promise<void>;
}

export const useBookSearch = (): BookSearchState & BookSearchActions => {
  const { t } = useTranslation('offline');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastQuery, setLastQuery] = useState<string>('');
  const [lastFilters, setLastFilters] = useState<Partial<SearchQuery>>({});

  // Network state for offline detection
  const { isOnline } = useNetworkState();
  const isOffline = !isOnline;

  // Use ref to store the latest searchBooks function to avoid circular dependencies
  const searchBooksRef = useRef<((query: string, filters?: Partial<SearchQuery>, page?: number) => Promise<void>) | null>(null);

  const searchBooks = useCallback(async (
    query: string,
    filters: Partial<SearchQuery> = {},
    page: number = 1
  ): Promise<void> => {
    if (!query.trim() && !filters.categoryId && !filters.authorId) {
      setBooks([]);
      setLoading(false);
      setError(null);
      setHasMore(false);
      setTotalCount(0);
      setCurrentPage(1);
      return;
    }

    setLoading(true);
    setError(null);

    // If offline, use SQLite for search
    if (isOffline) {
      try {
        // Use advanced search with filters and sorting
        const localBooks = await bookRepository.searchWithFilters({
          query: query.trim(),
          status: filters.status,
          authorId: filters.authorId,
          categoryId: filters.categoryId,
          sortBy: mapSortByToOfflineField(filters.sortBy),
          sortOrder: filters.sortOrder ?? SORT_DIRECTIONS.DESC,
        });

        setBooks(localBooks.map(lb => lb.entity));
        setTotalCount(localBooks.length);
        setHasMore(false); // No pagination for offline search
        setCurrentPage(1);
        setLastQuery(query);
        setLastFilters(filters);
      } catch (err: unknown) {
        console.error('Offline book search failed:', err);
        setError(t('search.offlineSearchFailed'));
        setBooks([]);
        setTotalCount(0);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Online search using API
    try {
      const searchParams = {
        query: query.trim() || undefined,
        page,
        limit: filters.limit ?? 20,
        status: filters.status,
        authorId: filters.authorId,
        categoryId: filters.categoryId,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      const response = await bookAPI.searchBooks(searchParams);

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

    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string }; status?: number }; message?: string };
      mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
        operation: 'search',
        resource: RESOURCE_TYPES.BOOK,
        error: e.response?.data?.message || e.message,
        statusCode: e.response?.status,
        query,
        source: 'useBookSearch_searchBooks'
      });
      setError(t('search.searchFailed'));

      // Fallback to offline search on network error
      try {
        const localBooks = await bookRepository.searchWithFilters({
          query: query.trim(),
          status: filters.status,
          authorId: filters.authorId,
          categoryId: filters.categoryId,
          sortBy: mapSortByToOfflineField(filters.sortBy),
          sortOrder: filters.sortOrder ?? SORT_DIRECTIONS.DESC,
        });
        setBooks(localBooks.map(lb => lb.entity));
        setTotalCount(localBooks.length);
        setHasMore(false);
        setError(t('search.showingOfflineResults'));
      } catch {
        setBooks([]);
        setTotalCount(0);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, [isOffline, t]);

  // Update the ref with the latest searchBooks function
  searchBooksRef.current = searchBooks;

  const searchByISBN = useCallback(async (isbn: string): Promise<Book | null> => {
    if (!isbn.trim()) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const book = await bookAPI.searchByISBN(isbn);
      return book;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string }; status?: number }; message?: string };
      mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
        operation: 'isbn_search',
        resource: RESOURCE_TYPES.BOOK,
        error: e.response?.data?.message || e.message,
        statusCode: e.response?.status,
        isbn,
        source: 'useBookSearch_searchByISBN'
      });
      setError(t('search.bookNotFound'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || loading || !searchBooksRef.current) {
      return;
    }

    await searchBooksRef.current(lastQuery, lastFilters, currentPage + 1);
  }, [hasMore, loading, lastQuery, lastFilters, currentPage]);

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
    isOffline,
    searchBooks,
    searchByISBN,
    clearSearch,
    loadMore
  };
};
