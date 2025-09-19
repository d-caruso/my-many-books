import { useState, useCallback, useRef } from 'react';
import { Book, SearchQuery } from '@/types';
import { bookAPI } from '@/services/api';

interface BookSearchState {
  books: Book[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
}

interface BookSearchActions {
  searchBooks: (query: string, filters?: Partial<SearchQuery>, page?: number) => Promise<void>;
  searchByISBN: (isbn: string) => Promise<Book | null>;
  clearSearch: () => void;
  loadMore: () => Promise<void>;
}

export const useBookSearch = (): BookSearchState & BookSearchActions => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastQuery, setLastQuery] = useState<string>('');
  const [lastFilters, setLastFilters] = useState<Partial<SearchQuery>>({});
  
  // Use ref to store the latest searchBooks function to avoid circular dependencies
  const searchBooksRef = useRef<((query: string, filters?: Partial<SearchQuery>, page?: number) => Promise<void>) | null>(null);

  const searchBooks = useCallback(async (
    query: string, 
    filters: Partial<SearchQuery> = {}, 
    page: number = 1
  ): Promise<void> => {
    if (!query.trim() && !filters.category && !filters.author) {
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

    try {
      const searchParams = {
        q: query.trim(),
        page,
        limit: 20,
        ...filters
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
      
    } catch (err: any) {
      console.error('Book search failed:', err);
      setError(err.response?.data?.message || 'Failed to search books');
      
      if (page === 1) {
        setBooks([]);
        setTotalCount(0);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Update the ref with the latest searchBooks function
  searchBooksRef.current = searchBooks;

  const searchByISBN = useCallback(async (isbn: string): Promise<Book | null> => {
    if (!isbn.trim()) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await bookAPI.searchByIsbn(isbn);
      return response.book || null;
    } catch (err: any) {
      console.error('ISBN search failed:', err);
      setError(err.response?.data?.message || 'Book not found');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

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
    searchBooks,
    searchByISBN,
    clearSearch,
    loadMore
  };
};