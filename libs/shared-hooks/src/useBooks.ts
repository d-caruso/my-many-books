/**
 * Shared books management hook - works on web and mobile
 */

import { useState, useEffect, useCallback } from 'react';
import { Book, BookFormData, PaginatedResponse } from '@my-many-books/shared-types';

interface BooksState {
  books: Book[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  hasMore: boolean;
}

interface BooksActions {
  loadBooks: (page?: number) => Promise<void>;
  createBook: (bookData: BookFormData) => Promise<Book | null>;
  updateBook: (id: number, bookData: Partial<BookFormData>) => Promise<Book | null>;
  deleteBook: (id: number) => Promise<boolean>;
  updateBookStatus: (id: number, status: Book['status']) => Promise<Book | null>;
  refreshBooks: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export interface BooksAPI {
  getBooks: (page?: number, limit?: number) => Promise<PaginatedResponse<Book>>;
  createBook: (data: BookFormData) => Promise<Book>;
  updateBook: (id: number, data: Partial<BookFormData>) => Promise<Book>;
  deleteBook: (id: number) => Promise<void>;
  updateBookStatus: (id: number, status: Book['status']) => Promise<Book>;
}

export const useBooks = (api: BooksAPI, autoLoad = true): BooksState & BooksActions => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadBooks = useCallback(async (page: number = 1): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getBooks(page, 20);
      
      if (page === 1) {
        setBooks(response.books || []);
      } else {
        setBooks(prev => [...prev, ...(response.books || [])]);
      }
      
      setTotalCount(response.pagination.totalItems);
      setCurrentPage(page);
      setHasMore(page < response.pagination.totalPages);
      
    } catch (err: any) {
      console.error('Failed to load books:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load books');
      
      if (page === 1) {
        setBooks([]);
        setTotalCount(0);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, [api]);

  const createBook = useCallback(async (bookData: BookFormData): Promise<Book | null> => {
    try {
      const newBook = await api.createBook(bookData);
      setBooks(prev => [newBook, ...prev]);
      setTotalCount(prev => prev + 1);
      return newBook;
    } catch (err: any) {
      console.error('Failed to create book:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create book');
      return null;
    }
  }, [api]);

  const updateBook = useCallback(async (id: number, bookData: Partial<BookFormData>): Promise<Book | null> => {
    try {
      const updatedBook = await api.updateBook(id, bookData);
      setBooks(prev => prev.map(book => book.id === id ? updatedBook : book));
      return updatedBook;
    } catch (err: any) {
      console.error('Failed to update book:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update book');
      return null;
    }
  }, [api]);

  const deleteBook = useCallback(async (id: number): Promise<boolean> => {
    try {
      await api.deleteBook(id);
      setBooks(prev => prev.filter(book => book.id !== id));
      setTotalCount(prev => prev - 1);
      return true;
    } catch (err: any) {
      console.error('Failed to delete book:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete book');
      return false;
    }
  }, [api]);

  const updateBookStatus = useCallback(async (id: number, status: Book['status']): Promise<Book | null> => {
    try {
      const updatedBook = await api.updateBookStatus(id, status);
      setBooks(prev => prev.map(book => book.id === id ? updatedBook : book));
      return updatedBook;
    } catch (err: any) {
      console.error('Failed to update book status:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update book status');
      return null;
    }
  }, [api]);

  const refreshBooks = useCallback(async (): Promise<void> => {
    setCurrentPage(1);
    await loadBooks(1);
  }, [loadBooks]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || loading) {
      return;
    }
    await loadBooks(currentPage + 1);
  }, [hasMore, loading, currentPage, loadBooks]);

  // Load books on mount if autoLoad is enabled
  useEffect(() => {
    if (autoLoad) {
      loadBooks(1);
    }
  }, [loadBooks, autoLoad]);

  return {
    books,
    loading,
    error,
    totalCount,
    currentPage,
    hasMore,
    loadBooks,
    createBook,
    updateBook,
    deleteBook,
    updateBookStatus,
    refreshBooks,
    loadMore
  };
};