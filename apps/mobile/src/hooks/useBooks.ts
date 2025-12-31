import { useState, useCallback, useEffect } from 'react';
import { Book } from '@/types';
import { bookAPI } from '@/services/api';
import { bookRepository } from '@/services/database/BookRepository';
import { databaseService } from '@/services/database/DatabaseService';
import { migrationSystem } from '@/services/database/migrations';
import { migrateFromAsyncStorage, cleanupLegacyStorage } from '@/services/database/migrateFromAsyncStorage';
import { operationQueue } from '@/services/OperationQueue';
import { useNetworkState } from '@/hooks/useNetworkState';
import { v4 as uuidv4 } from 'uuid';
import { resolveConflict as resolveBookConflict } from '@/utils/conflictDetection';
import { useTranslation } from 'react-i18next';

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
  updateBook: (id: number | string, bookData: Partial<Book>) => Promise<Book>;
  deleteBook: (id: number | string) => Promise<void>;
  updateBookStatus: (id: number | string, status: Book['status']) => Promise<void>;
  resolveConflict: (bookId: number | string, choice: 'local' | 'server') => Promise<void>;
}

// Helper to check if error is retriable (network/server errors)
const isRetriableError = (error: any): boolean => {
  if (!error.response) return true; // Network error
  const status = error.response.status;
  return status >= 500 || status === 408 || status === 429; // Server errors, timeout, rate limit
};

export const useBooks = (): UseBooksState & UseBooksActions => {
  const { t } = useTranslation('offline');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const { isOnline } = useNetworkState();

  useEffect(() => {
    initDatabase();
  }, []);

  // Reload from database when coming back online to reflect queue processing changes
  useEffect(() => {
    if (isOnline) {
      // Add a small delay to allow queue processing to complete first
      const timer = setTimeout(async () => {
        // First reload from database to get any queue processing results
        await loadBooksFromDB();
        // Then fetch from server to get the latest data
        await loadBooks();
      }, 3000); // Wait 3 seconds for queue to process
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, loadBooks]);

  const initDatabase = async () => {
    try {
      // Initialize database and run migrations
      await databaseService.openDatabase();
      await migrationSystem.runMigrations();

      // Migrate from AsyncStorage if needed (one-time)
      const migrationResult = await migrateFromAsyncStorage();
      
      if (!migrationResult.success && migrationResult.error) {
        // Migration failed - show specific error with retry option
        setMigrationError(t('database.migrationFailed') + ': ' + migrationResult.error);
        return; // Don't continue initialization
      }
      
      // Clean up legacy storage after successful migration (Task 4.4.2)
      if (migrationResult.success && migrationResult.count > 0) {
        await cleanupLegacyStorage();
      }

      // Clear any previous migration error
      setMigrationError(null);

      // Load books from SQLite
      await loadBooksFromDB();

      // Fetch fresh data from server
      await loadBooks();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      setError(t('database.initializationFailed'));
    }
  };

  const retryMigration = async () => {
    setMigrationError(null);
    await initDatabase();
  };

  const loadBooksFromDB = async () => {
    try {
      const dbBooks = await bookRepository.findAll();
      setBooks(dbBooks);
    } catch (error) {
      console.error('Failed to load books from database:', error);
    }
  };

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await bookAPI.getBooks();

      // Upsert server data into SQLite (prevents PRIMARY KEY conflicts)
      for (const book of response.books) {
        await bookRepository.upsert({
          ...book,
          _syncStatus: 'synced',
          _serverUpdatedAt: book.updateDate,
        });
      }

      // Update local state
      setBooks(response.books);
    } catch (err: any) {
      console.error('Failed to load books:', err);
      setError(err.response?.data?.message || t('books.loadFailed'));

      // On error, load from local database
      await loadBooksFromDB();
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBooks = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response = await bookAPI.getBooks();

      // Upsert server data into SQLite (prevents PRIMARY KEY conflicts)
      for (const book of response.books) {
        await bookRepository.upsert({
          ...book,
          _syncStatus: 'synced',
          _serverUpdatedAt: book.updateDate,
        });
      }

      // Update local state
      setBooks(response.books);
    } catch (err: any) {
      console.error('Failed to refresh books:', err);
      setError(err.response?.data?.message || t('books.refreshFailed'));

      // On error, load from local database
      await loadBooksFromDB();
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

    // Add to SQLite and local state immediately (optimistic update)
    await bookRepository.create(optimisticBook);
    setBooks(prev => [optimisticBook, ...prev]);

    try {
      // Try to create on server - include temp ID for queue processing
      const newBook = await bookAPI.createBook({
        ...bookData,
        id: tempId, // Include temp ID so queue can map it later
        _tempId: tempId,
      });

      // Replace temp book with real book from server in SQLite
      await bookRepository.hardDelete(tempId);
      await bookRepository.create({
        ...newBook,
        _syncStatus: 'synced',
        _serverUpdatedAt: newBook.updateDate,
      });

      // Update local state
      setBooks(prev => prev.map(book =>
        book._tempId === tempId ? { ...newBook, _syncStatus: 'synced' } : book
      ));

      return newBook;
    } catch (err: any) {
      console.error('Failed to create book:', err);

      // If error is retriable, keep optimistic book with pending status
      // Note: API service already handles queueing via withQueueOnError, so we don't queue again here
      if (isRetriableError(err)) {
        await bookRepository.update(tempId, { _syncStatus: 'pending' });
        setBooks(prev => prev.map(book =>
          book._tempId === tempId ? { ...book, _syncStatus: 'pending' } : book
        ));
        return optimisticBook;
      } else {
        // Non-retriable error - remove optimistic book
        await bookRepository.hardDelete(tempId);
        setBooks(prev => prev.filter(book => book._tempId !== tempId));
        throw new Error(err.response?.data?.message || t('books.createFailed'));
      }
    }
  }, []);

  const updateBook = useCallback(async (id: number | string, bookData: Partial<Book>): Promise<Book> => {
    // Store previous state for rollback
    const previousBook = books.find(book => book.id == id);
    if (!previousBook) {
      throw new Error(t('books.notFound'));
    }

    // Apply changes to SQLite and local state immediately (optimistic update)
    const stringId = String(id);
    await bookRepository.update(stringId, {
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
    });

    setBooks(prev => prev.map(book =>
      book.id == id ? { ...book, ...bookData, _syncStatus: 'pending' } : book
    ));

    try {
      // Try to update on server
      const updatedBook = await bookAPI.updateBook(id, bookData);

      // Update with server response and check for conflicts
      const optimisticBook = books.find(b => b.id === id);
      const serverUpdatedAt = new Date(updatedBook.updateDate);
      const localUpdatedAt = optimisticBook ? new Date(optimisticBook.updateDate) : new Date();
      
      // Simple conflict detection: if server version is newer than our optimistic update
      const hasConflict = serverUpdatedAt > localUpdatedAt && 
                         previousBook._serverUpdatedAt && 
                         new Date(previousBook._serverUpdatedAt) < serverUpdatedAt;

      if (hasConflict) {
        console.warn('Conflict detected for book update:', {
          bookId: id,
          serverVersion: updatedBook.updateDate,
          localVersion: optimisticBook?.updateDate,
          lastKnownServer: previousBook._serverUpdatedAt
        });
      }

      // Update SQLite with server response
      await bookRepository.update(stringId, {
        ...updatedBook,
        _syncStatus: 'synced',
        _serverUpdatedAt: updatedBook.updateDate,
        _hasConflict: hasConflict
      });

      // Update local state
      setBooks(prev => prev.map(book =>
        book.id == id ? { 
          ...updatedBook, 
          _syncStatus: 'synced', 
          _serverUpdatedAt: updatedBook.updateDate,
          _hasConflict: hasConflict
        } : book
      ));

      return updatedBook;
    } catch (err: any) {
      console.error('Failed to update book:', err);

      // If error is retriable, keep pending status  
      // Note: API service already handles queueing via withQueueOnError, so we don't queue again here
      if (isRetriableError(err)) {
        const pendingBook = books.find(b => b.id == id);
        if (pendingBook) {
          return { ...pendingBook, ...bookData, _syncStatus: 'pending' };
        }
      } else {
        // Non-retriable error - rollback optimistic changes using stored rollback data
        if (previousBook._rollbackData?.previousValues) {
          await bookRepository.update(stringId, {
            ...previousBook._rollbackData.previousValues,
            _syncStatus: 'failed',
            _rollbackData: null, // Clear rollback data after restoring
          });
          setBooks(prev => prev.map(book =>
            book.id == id ? { 
              ...book, 
              ...previousBook._rollbackData.previousValues,
              _syncStatus: 'failed',
              _rollbackData: null
            } : book
          ));
        } else {
          // Fallback: just mark as failed if no rollback data
          await bookRepository.update(stringId, { _syncStatus: 'failed' });
          setBooks(prev => prev.map(book =>
            book.id == id ? { ...book, _syncStatus: 'failed' } : book
          ));
        }
      }

      throw new Error(err.response?.data?.message || t('books.updateFailed'));
    }
  }, [books]);

  const deleteBook = useCallback(async (id: number | string): Promise<void> => {
    const stringId = String(id);

    // Soft delete in SQLite and remove from local state immediately (optimistic)
    await bookRepository.delete(stringId);
    setBooks(prev => prev.filter(book => book.id != id));

    try {
      // Try to delete on server
      await bookAPI.deleteBook(id);

      // On success, permanently delete from SQLite
      await bookRepository.hardDelete(stringId);
    } catch (err: any) {
      console.error('Failed to delete book:', err);

      // If error is retriable, keep soft-deleted with pending status
      // Note: API service already handles queueing via withQueueOnError, so we don't queue again here
      if (isRetriableError(err)) {
        // Book already marked as deleted and pending in SQLite
        return;
      } else {
        // Non-retriable error - restore the book
        const deletedBook = await databaseService.getFirstAsync(
          'SELECT * FROM books WHERE id = ?',
          [stringId]
        );
        if (deletedBook) {
          await databaseService.executeQuery(
            'UPDATE books SET _deleted = 0, _sync_status = ? WHERE id = ?',
            ['synced', stringId]
          );
          await loadBooksFromDB(); // Reload to restore the book
        }
        throw new Error(err.response?.data?.message || t('books.deleteFailed'));
      }
    }
  }, []);

  const updateBookStatus = useCallback(async (id: number | string, status: Book['status']): Promise<void> => {
    const stringId = String(id);

    // Update SQLite and local state immediately (optimistic)
    await bookRepository.update(stringId, { status, _syncStatus: 'pending' });
    setBooks(prev => prev.map(book =>
      book.id == id ? { ...book, status, _syncStatus: 'pending' } : book
    ));

    try {
      // Try to update on server
      await bookAPI.updateBook(id, { status });

      // Mark as synced
      await bookRepository.update(stringId, { _syncStatus: 'synced' });
      setBooks(prev => prev.map(book =>
        book.id == id ? { ...book, _syncStatus: 'synced' } : book
      ));
    } catch (err: any) {
      console.error('Failed to update book status:', err);

      // If error is retriable, keep pending status
      // Note: API service already handles queueing via withQueueOnError, so we don't queue again here
      if (isRetriableError(err)) {
        // Already marked as pending
        return;
      } else {
        // Non-retriable error - mark as failed
        await bookRepository.update(stringId, { _syncStatus: 'failed' });
        setBooks(prev => prev.map(book =>
          book.id == id ? { ...book, _syncStatus: 'failed' } : book
        ));
        throw new Error(err.response?.data?.message || t('books.updateStatusFailed'));
      }
    }
  }, []);

  const resolveConflict = useCallback(async (bookId: number | string, choice: 'local' | 'server'): Promise<void> => {
    const stringId = String(bookId);
    const conflictedBook = books.find(book => book.id == bookId);
    
    if (!conflictedBook || !conflictedBook._hasConflict) {
      throw new Error(t('conflicts.notFound'));
    }

    try {
      if (choice === 'local') {
        // Keep local version, mark for re-sync to server
        await bookRepository.update(stringId, {
          _syncStatus: 'pending',
          _hasConflict: false,
        });

        setBooks(prev => prev.map(book =>
          book.id == bookId ? { 
            ...book, 
            _syncStatus: 'pending', 
            _hasConflict: false 
          } : book
        ));

        // CRITICAL FIX: Queue the update operation so server receives the conflict resolution
        try {
          await bookAPI.updateBook(bookId, conflictedBook);
          console.log(`Conflict resolved for book ${bookId}: keeping local version - update sent to server`);
        } catch (error) {
          console.log(`Conflict resolved for book ${bookId}: keeping local version - will retry via queue`);
          // If immediate update fails, it's already marked as pending and will be queued automatically
        }
        
      } else {
        // Use server version - need to fetch latest from server
        const serverBook = await bookAPI.getBook(bookId);
        const resolvedBook = resolveBookConflict(conflictedBook, serverBook, 'server');
        
        await bookRepository.update(stringId, {
          ...resolvedBook,
          _hasConflict: false,
        });

        setBooks(prev => prev.map(book =>
          book.id == bookId ? { 
            ...resolvedBook, 
            _hasConflict: false 
          } : book
        ));

        console.log(`Conflict resolved for book ${bookId}: using server version`);
      }
      
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw new Error(t('conflicts.resolutionFailed'));
    }
  }, [books]);

  return {
    books,
    loading,
    error,
    refreshing,
    migrationError,
    retryMigration,
    loadBooks,
    refreshBooks,
    createBook,
    updateBook,
    deleteBook,
    updateBookStatus,
    resolveConflict,
  };
};