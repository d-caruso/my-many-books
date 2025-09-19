import { useState, useCallback, useEffect } from 'react';
import { Book } from '@/types';
import { bookAPI } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UseBooksState {
  books: Book[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

interface UseBooksActions {
  loadBooks: () => Promise<void>;
  refreshBooks: () => Promise<void>;
  createBook: (bookData: Partial<Book>) => Promise<Book>;
  updateBook: (id: number, bookData: Partial<Book>) => Promise<Book>;
  deleteBook: (id: number) => Promise<void>;
  updateBookStatus: (id: number, status: Book['status']) => Promise<void>;
}

const BOOKS_CACHE_KEY = 'cached_books';

export const useBooks = (): UseBooksState & UseBooksActions => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCachedBooks();
    loadBooks();
  }, []);

  const loadCachedBooks = async () => {
    try {
      const cachedBooks = await AsyncStorage.getItem(BOOKS_CACHE_KEY);
      if (cachedBooks) {
        setBooks(JSON.parse(cachedBooks));
      }
    } catch (error) {
      console.error('Failed to load cached books:', error);
    }
  };

  const cacheBooks = async (booksToCache: Book[]) => {
    try {
      await AsyncStorage.setItem(BOOKS_CACHE_KEY, JSON.stringify(booksToCache));
    } catch (error) {
      console.error('Failed to cache books:', error);
    }
  };

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await bookAPI.getBooks();
      setBooks(response.books);
      await cacheBooks(response.books);
    } catch (err: any) {
      console.error('Failed to load books:', err);
      setError(err.response?.data?.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBooks = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response = await bookAPI.getBooks();
      setBooks(response.books);
      await cacheBooks(response.books);
    } catch (err: any) {
      console.error('Failed to refresh books:', err);
      setError(err.response?.data?.message || 'Failed to refresh books');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const createBook = useCallback(async (bookData: Partial<Book>): Promise<Book> => {
    try {
      const newBook = await bookAPI.createBook(bookData);
      setBooks(prev => [newBook, ...prev]);
      await cacheBooks([newBook, ...books]);
      return newBook;
    } catch (err: any) {
      console.error('Failed to create book:', err);
      throw new Error(err.response?.data?.message || 'Failed to create book');
    }
  }, [books]);

  const updateBook = useCallback(async (id: number, bookData: Partial<Book>): Promise<Book> => {
    try {
      const updatedBook = await bookAPI.updateBook(id, bookData);
      setBooks(prev => prev.map(book => book.id === id ? updatedBook : book));
      const updatedBooks = books.map(book => book.id === id ? updatedBook : book);
      await cacheBooks(updatedBooks);
      return updatedBook;
    } catch (err: any) {
      console.error('Failed to update book:', err);
      throw new Error(err.response?.data?.message || 'Failed to update book');
    }
  }, [books]);

  const deleteBook = useCallback(async (id: number): Promise<void> => {
    try {
      await bookAPI.deleteBook(id);
      setBooks(prev => prev.filter(book => book.id !== id));
      const filteredBooks = books.filter(book => book.id !== id);
      await cacheBooks(filteredBooks);
    } catch (err: any) {
      console.error('Failed to delete book:', err);
      throw new Error(err.response?.data?.message || 'Failed to delete book');
    }
  }, [books]);

  const updateBookStatus = useCallback(async (id: number, status: Book['status']): Promise<void> => {
    try {
      await bookAPI.updateBook(id, { status });
      setBooks(prev => prev.map(book => 
        book.id === id ? { ...book, status } : book
      ));
      const updatedBooks = books.map(book => 
        book.id === id ? { ...book, status } : book
      );
      await cacheBooks(updatedBooks);
    } catch (err: any) {
      console.error('Failed to update book status:', err);
      throw new Error(err.response?.data?.message || 'Failed to update book status');
    }
  }, [books]);

  return {
    books,
    loading,
    error,
    refreshing,
    loadBooks,
    refreshBooks,
    createBook,
    updateBook,
    deleteBook,
    updateBookStatus,
  };
};