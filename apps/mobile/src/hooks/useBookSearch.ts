import { useState, useCallback, useMemo } from 'react';
import { useBookSearch as useSharedBookSearch, type BookSearchAPI } from '@my-many-books/shared-ui-hooks';
import { Book, SearchQuery } from '@/types';
import { bookAPI } from '@/services/api';
import { bookRepository } from '@/services/database/BookRepository';
import { useNetworkState } from './useNetworkState';
import { useTranslation } from 'react-i18next';
import { mobileHooks, MOBILE_EVENTS, RESOURCE_TYPES } from '@/services/hooks/mobileHooks';
import {
  SORT_DIRECTIONS,
  type SearchFilters,
} from '@my-many-books/shared-types';

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
  const [offlineBooks, setOfflineBooks] = useState<Book[]>([]);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [offlineHasMore, setOfflineHasMore] = useState(false);
  const [offlineTotalCount, setOfflineTotalCount] = useState(0);
  const [offlineCurrentPage, setOfflineCurrentPage] = useState(1);
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  // Network state for offline detection
  const { isOnline } = useNetworkState();
  const isOffline = !isOnline;

  const runOfflineSearch = useCallback(async (query: string, filters: Partial<SearchQuery> = {}) => {
    const localBooks = await bookRepository.searchWithFilters({
      query: query.trim(),
      status: filters.status,
      authorId: filters.authorId,
      categoryId: filters.categoryId,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder ?? SORT_DIRECTIONS.DESC,
    });
    return localBooks.map(localBook => localBook.entity);
  }, []);

  const clearOfflineSearch = useCallback(() => {
    setOfflineBooks([]);
    setOfflineLoading(false);
    setOfflineError(null);
    setOfflineHasMore(false);
    setOfflineTotalCount(0);
    setOfflineCurrentPage(1);
  }, []);

  const emitSearchError = useCallback((operation: 'search' | 'isbn_search', payload: { query?: string; isbn?: string; error: unknown }) => {
    const err = payload.error as { response?: { data?: { message?: string }; status?: number }; message?: string };
    mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
      operation,
      resource: RESOURCE_TYPES.BOOK,
      error: err.response?.data?.message || err.message,
      statusCode: err.response?.status,
      ...(payload.query ? { query: payload.query } : {}),
      ...(payload.isbn ? { isbn: payload.isbn } : {}),
      source: operation === 'search' ? 'useBookSearch_searchBooks' : 'useBookSearch_searchByISBN'
    });
  }, []);

  const onlineApi = useMemo<BookSearchAPI<Book, SearchFilters>>(
    () => ({
      searchBooks: async (params) => {
        setFallbackError(null);

        try {
          return await bookAPI.searchBooks(params);
        } catch (error) {
          emitSearchError('search', { query: params.query, error });

          try {
            const localBooks = await runOfflineSearch(params.query ?? '', params);
            setFallbackError(t('search.showingOfflineResults'));

            return {
              books: localBooks,
              total: localBooks.length,
              hasMore: false,
              page: params.page ?? 1,
            };
          } catch {
            throw new Error(t('search.searchFailed'));
          }
        }
      },
      searchByISBN: async (isbn) => {
        try {
          return await bookAPI.searchByISBN(isbn);
        } catch (error) {
          emitSearchError('isbn_search', { isbn, error });
          throw new Error(t('search.bookNotFound'));
        }
      },
    }),
    [emitSearchError, runOfflineSearch, t]
  );

  const {
    books: onlineBooks,
    loading: onlineLoading,
    error: onlineError,
    hasMore: onlineHasMore,
    totalCount: onlineTotalCount,
    currentPage: onlineCurrentPage,
    searchBooks: sharedSearchBooks,
    searchByISBN: sharedSearchByISBN,
    clearSearch: sharedClearSearch,
    loadMore: sharedLoadMore,
  } = useSharedBookSearch<Book, SearchFilters>(onlineApi);

  const searchBooks = useCallback(async (
    query: string,
    filters: Partial<SearchQuery> = {},
    page: number = 1
  ): Promise<void> => {
    if (isOffline) {
      if (!query.trim() && !filters.categoryId && !filters.authorId && !filters.status) {
        clearOfflineSearch();
        return;
      }

      setOfflineLoading(true);
      setOfflineError(null);

      try {
        const localBooks = await runOfflineSearch(query, filters);
        setOfflineBooks(localBooks);
        setOfflineTotalCount(localBooks.length);
        setOfflineHasMore(false);
        setOfflineCurrentPage(1);
      } catch (err: unknown) {
        console.error('Offline book search failed:', err);
        setOfflineError(t('search.offlineSearchFailed'));
        setOfflineBooks([]);
        setOfflineTotalCount(0);
        setOfflineHasMore(false);
      } finally {
        setOfflineLoading(false);
      }
      return;
    }

    setFallbackError(null);
    await sharedSearchBooks(query, filters, page);
  }, [clearOfflineSearch, isOffline, runOfflineSearch, sharedSearchBooks, t]);

  const searchByISBN = useCallback(async (isbn: string): Promise<Book | null> => {
    if (!isbn.trim()) {
      return null;
    }

    if (isOffline) {
      setOfflineLoading(true);
      setOfflineError(null);

      try {
        return await bookAPI.searchByISBN(isbn);
      } catch (error) {
        emitSearchError('isbn_search', { isbn, error });
        setOfflineError(t('search.bookNotFound'));
        return null;
      } finally {
        setOfflineLoading(false);
      }
    }

    setFallbackError(null);
    return sharedSearchByISBN(isbn);
  }, [emitSearchError, isOffline, sharedSearchByISBN, t]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (isOffline) {
      return;
    }

    await sharedLoadMore();
  }, [isOffline, sharedLoadMore]);

  const clearSearch = useCallback((): void => {
    setFallbackError(null);
    clearOfflineSearch();
    sharedClearSearch();
  }, [clearOfflineSearch, sharedClearSearch]);

  if (isOffline) {
    return {
      books: offlineBooks,
      loading: offlineLoading,
      error: offlineError,
      hasMore: offlineHasMore,
      totalCount: offlineTotalCount,
      currentPage: offlineCurrentPage,
      isOffline,
      searchBooks,
      searchByISBN,
      clearSearch,
      loadMore,
    };
  }

  return {
    books: onlineBooks,
    loading: onlineLoading,
    error: fallbackError ?? onlineError,
    hasMore: onlineHasMore,
    totalCount: onlineTotalCount,
    currentPage: onlineCurrentPage,
    isOffline,
    searchBooks,
    searchByISBN,
    clearSearch,
    loadMore,
  };
};
