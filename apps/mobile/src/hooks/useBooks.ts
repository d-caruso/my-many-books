import { useState, useCallback, useEffect } from 'react';
import { Book } from '@/types';
import { bookAPI } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { operationQueue } from '@/services/OperationQueue';
import { isRetriableError } from '@/services/QueueExecutor';

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
    // Generate temporary ID for optimistic update
    const tempId = `temp-${uuidv4()}`;
    const optimisticBook: Book = {
      ...bookData,
      id: tempId as any,
      _tempId: tempId,
      _syncStatus: 'pending',
      creationDate: new Date().toISOString(),
      updateDate: new Date().toISOString(),
    } as Book;

    // Add to local state immediately (optimistic update)
    setBooks(prev => [optimisticBook, ...prev]);
    await cacheBooks([optimisticBook, ...books]);

    try {
      // Try to create on server - include temp ID for queue processing
      const newBook = await bookAPI.createBook({
        ...bookData,
        id: tempId, // Include temp ID so queue can map it later
        _tempId: tempId,
      });

      // Replace temp book with real book from server
      setBooks(prev => prev.map(book =>
        book._tempId === tempId ? { ...newBook, _syncStatus: 'synced' } : book
      ));
      const updatedBooks = books.map(book =>
        book._tempId === tempId ? { ...newBook, _syncStatus: 'synced' } : book
      );
      await cacheBooks(updatedBooks);

      return newBook;
    } catch (err: any) {
      console.error('Failed to create book:', err);

      // If error is retriable, keep optimistic book and queue for sync
      if (isRetriableError(err)) {
        // Operation is already queued by API service
        // Just update sync status to show it's pending
        setBooks(prev => prev.map(book =>
          book._tempId === tempId ? { ...book, _syncStatus: 'pending' } : book
        ));
        return optimisticBook;
      } else {
        // Non-retriable error - remove optimistic book and throw
        setBooks(prev => prev.filter(book => book._tempId !== tempId));
        const filteredBooks = books.filter(book => book._tempId !== tempId);
        await cacheBooks(filteredBooks);
        throw new Error(err.response?.data?.message || 'Failed to create book');
      }
    }
  }, [books]);

  const updateBook = useCallback(async (id: number, bookData: Partial<Book>): Promise<Book> => {
    // Store previous state for rollback
    const previousBook = books.find(book => book.id === id);
    if (!previousBook) {
      throw new Error('Book not found');
    }

    // Apply optimistic update
    const optimisticBook: Book = {
      ...previousBook,
      ...bookData,
      _syncStatus: 'pending',
      updateDate: new Date().toISOString(),
      _rollbackData: { // Capture rollback metadata
        previousValues: {
          title: previousBook.title,
          status: previousBook.status,
          updateDate: previousBook.updateDate,
        },
      },
    };

    setBooks(prev => prev.map(book => book.id === id ? optimisticBook : book));
    const optimisticBooks = books.map(book => book.id === id ? optimisticBook : book);
    await cacheBooks(optimisticBooks);

    try {
      // Try to update on server
      const updatedBook = await bookAPI.updateBook(id, bookData);

      // Update with server response and check for conflicts
      const serverUpdatedAt = new Date(updatedBook.updateDate);
      const localUpdatedAt = new Date(optimisticBook.updateDate);
      
      // Simple conflict detection: if server version is newer than our optimistic update
      const hasConflict = serverUpdatedAt > localUpdatedAt && 
                         previousBook._serverUpdatedAt && 
                         new Date(previousBook._serverUpdatedAt) < serverUpdatedAt;

      if (hasConflict) {
        console.warn('Conflict detected for book update:', {
          bookId: id,
          serverVersion: updatedBook.updateDate,
          localVersion: optimisticBook.updateDate,
          lastKnownServer: previousBook._serverUpdatedAt
        });
      }

      setBooks(prev => prev.map(book =>
        book.id === id ? { 
          ...updatedBook, 
          _syncStatus: 'synced', 
          _serverUpdatedAt: updatedBook.updateDate,
          _hasConflict: hasConflict
        } : book
      ));
      const syncedBooks = books.map(book =>
        book.id === id ? { 
          ...updatedBook, 
          _syncStatus: 'synced', 
          _serverUpdatedAt: updatedBook.updateDate,
          _hasConflict: hasConflict
        } : book
      );
      await cacheBooks(syncedBooks);

      return updatedBook;
    } catch (err: any) {
      console.error('Failed to update book:', err);

      // If error is retriable, keep optimistic update
      if (isRetriableError(err)) {
        // Operation is already queued by API service
        return optimisticBook;
      } else {
        // Non-retriable error - rollback to previous state
        setBooks(prev => prev.map(book => book.id === id ? previousBook : book));
        const rolledBackBooks = books.map(book => book.id === id ? previousBook : book);
        await cacheBooks(rolledBackBooks);
        throw new Error(err.response?.data?.message || 'Failed to update book');
      }
    }
  }, [books]);

  const deleteBook = useCallback(async (id: number): Promise<void> => {
    // Store book for rollback
    const bookToDelete = books.find(book => book.id === id);
    if (!bookToDelete) {
      throw new Error('Book not found');
    }

    // Optimistic delete - mark as deleted but keep in state
    const deletedBook: Book = {
      ...bookToDelete,
      _deleted: true,
      _syncStatus: 'pending',
    };

    // Don't actually remove - just mark as deleted
    setBooks(prev => prev.map(book => book.id === id ? deletedBook : book));
    const markedBooks = books.map(book => book.id === id ? deletedBook : book);
    await cacheBooks(markedBooks);

    try {
      // Try to delete on server
      await bookAPI.deleteBook(id);

      // Now actually remove from state
      setBooks(prev => prev.filter(book => book.id !== id));
      const filteredBooks = books.filter(book => book.id !== id);
      await cacheBooks(filteredBooks);
    } catch (err: any) {
      console.error('Failed to delete book:', err);

      // If error is retriable, keep marked as deleted
      if (isRetriableError(err)) {
        // Operation is already queued by API service
        return;
      } else {
        // Non-retriable error - rollback (restore book)
        setBooks(prev => prev.map(book => book.id === id ? bookToDelete : book));
        const restoredBooks = books.map(book => book.id === id ? bookToDelete : book);
        await cacheBooks(restoredBooks);
        throw new Error(err.response?.data?.message || 'Failed to delete book');
      }
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
    books: books.filter(book => !book._deleted), // Filter out deleted books
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