/**
 * Shared books management hook - works on web and mobile
 */

import { useState, useEffect, useCallback } from 'react';
import { Book, BookFormData, PaginatedResponse } from '@my-many-books/shared-types';

export interface BooksState<TBook extends Book = Book> {
  books: TBook[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  hasMore: boolean;
}

export interface BooksActions<TBook extends Book = Book, TForm extends BookFormData = BookFormData> {
  loadBooks: (page?: number) => Promise<void>;
  createBook: (bookData: TForm) => Promise<TBook | null>;
  updateBook: (id: number, bookData: Partial<TForm>) => Promise<TBook | null>;
  deleteBook: (id: number) => Promise<boolean>;
  updateBookStatus: (id: number, status: TBook['status']) => Promise<TBook | null>;
  refreshBooks: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export interface BooksAPI<TBook extends Book = Book, TForm extends BookFormData = BookFormData> {
  getBooks: (page?: number, limit?: number) => Promise<PaginatedResponse<TBook>>;
  createBook: (data: TForm) => Promise<TBook>;
  updateBook: (id: number, data: Partial<TForm>) => Promise<TBook>;
  deleteBook: (id: number) => Promise<void>;
  updateBookStatus: (id: number, status: TBook['status']) => Promise<TBook>;
}

export interface UseBooksOptions {
  autoLoad?: boolean;
  pageSize?: number;
}

export type UseBooksResult<TBook extends Book = Book, TForm extends BookFormData = BookFormData> =
  BooksState<TBook> & BooksActions<TBook, TForm>;

export const useBooks = <TBook extends Book = Book, TForm extends BookFormData = BookFormData>(
  api: BooksAPI<TBook, TForm>,
  options: UseBooksOptions = {}
): UseBooksResult<TBook, TForm> => {
  const pageSize = options.pageSize ?? 20;
  const autoLoad = options.autoLoad ?? true;

  const [books, setBooks] = useState<TBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadBooks = useCallback(async (page: number = 1): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.getBooks(page, pageSize);
      const receivedBooks = response.books ?? [];
      const pagination = response.pagination;
      
      if (page === 1) {
        setBooks(receivedBooks);
      } else {
        setBooks(prev => [...prev, ...receivedBooks]);
      }
      
      setTotalCount(pagination?.totalItems ?? receivedBooks.length);
      setCurrentPage(page);
      const totalPages = pagination?.totalPages ?? page;
      setHasMore(page < totalPages);
      
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
  }, [api, pageSize]);

  const createBook = useCallback(async (bookData: TForm): Promise<TBook | null> => {
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

  const updateBook = useCallback(async (id: number, bookData: Partial<TForm>): Promise<TBook | null> => {
    try {
      const updatedBook = await api.updateBook(id, bookData);
      setBooks(prev => prev.map(book => (book.id === id ? updatedBook : book)));
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

  const updateBookStatus = useCallback(async (id: number, status: TBook['status']): Promise<TBook | null> => {
    try {
      const updatedBook = await api.updateBookStatus(id, status);
      setBooks(prev => prev.map(book => (book.id === id ? updatedBook : book)));
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
      void loadBooks(1);
    }
  }, [autoLoad, loadBooks]);

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
