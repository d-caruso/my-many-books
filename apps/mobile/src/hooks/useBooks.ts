import { useState, useCallback, useEffect } from 'react';
import { Book, SYNC_STATUS } from '@/types';
import type { BookFormData } from '@my-many-books/shared-types';
import { bookAPI } from '@/services/api';
import { bookRepository } from '@/services/database/BookRepository';
import { databaseService } from '@/services/database/DatabaseService';
import { migrationSystem } from '@/services/database/migrations';
import { useNetworkState } from '@/hooks/useNetworkState';
import { v4 as uuidv4 } from 'uuid';
import { resolveConflict as resolveBookConflict } from '@/utils/conflictDetection';
import { useTranslation } from 'react-i18next';
import { extractErrorMessage, extractErrorDetails } from '@my-many-books/shared-utils';
import { mobileHooks, MOBILE_EVENTS, RESOURCE_TYPES } from '@/services/hooks/mobileHooks';
import { OPERATION_TYPES } from '@/services/hooks/eventsSchema';
import { LocalBook } from '@/entities/LocalBook';

type CreateBookInput = Partial<BookFormData> & { _tempId?: string; id?: string | number };
type UiBook = Book & {
  _tempId?: string;
  _syncStatus?: (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];
  _serverUpdatedAt?: string;
  _hasConflict?: boolean;
  serverId?: number;
  _rollbackData?: { previousValues?: Partial<Book> } | null;
};

const bookToUi = (book: Book, meta: Partial<UiBook> = {}): UiBook => ({
  ...book,
  _tempId: meta._tempId,
  _syncStatus: meta._syncStatus ?? SYNC_STATUS.SYNCED,
  _serverUpdatedAt: meta._serverUpdatedAt ?? (book.updateDate as string | undefined),
  _hasConflict: meta._hasConflict,
  serverId: meta.serverId,
  _rollbackData: meta._rollbackData ?? null,
});

const localToUi = (local: LocalBook): UiBook =>
  bookToUi(local.entity, {
    _tempId: local.tempId,
    _syncStatus: local.syncStatus,
    _serverUpdatedAt: local.serverUpdatedAt,
    serverId: local.serverId,
  });

const uiToLocal = (ui: UiBook): LocalBook => {
  const { _tempId, _syncStatus, _serverUpdatedAt, serverId, _hasConflict, _rollbackData, ...book } = ui;
  const local = new LocalBook(book as Book);
  local.tempId = _tempId;
  local.syncStatus = _syncStatus ?? SYNC_STATUS.SYNCED;
  local.serverUpdatedAt = _serverUpdatedAt;
  local.serverId = serverId;
  return local;
};

interface UseBooksState {
  books: UiBook[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

interface UseBooksActions {
  loadBooks: () => Promise<void>;
  refreshBooks: () => Promise<void>;
  createBook: (bookData: CreateBookInput) => Promise<UiBook>;
  updateBook: (id: number | string, bookData: Partial<Book>) => Promise<UiBook>;
  deleteBook: (id: number | string) => Promise<void>;
  updateBookStatus: (id: number | string, status: Book['status']) => Promise<void>;
  resolveConflict: (bookId: number | string, choice: 'local' | 'server') => Promise<void>;
}

// Helper to check if error is retriable (network/server errors)
const isRetriableError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return true; // Network error
  if (!('response' in error)) return true; // Network error
  const response = (error as { response?: { status?: number } }).response;
  if (!response?.status) return true; // Network error
  const status = response.status;
  return status >= 500 || status === 408 || status === 429; // Server errors, timeout, rate limit
};

export const useBooks = (): UseBooksState & UseBooksActions => {
  const { t } = useTranslation('offline');
  const [books, setBooks] = useState<UiBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { isOnline } = useNetworkState();

  const initDatabase = async () => {
    try {
      // Initialize database and run migrations
      await databaseService.openDatabase();
      await migrationSystem.runMigrations();

      // Load books from SQLite
      await loadBooksFromDB();

      // Fetch fresh data from server
      await loadBooks();
    } catch (error) {
      mobileHooks.emit(MOBILE_EVENTS.ERROR.STORAGE, {
        operation: 'initialize_database',
        error: error instanceof Error ? error.message : String(error),
        source: 'useBooks_initializeDatabase'
      });
      setError(t('database.initializationFailed'));
    }
  };


  const loadBooksFromDB = async () => {
    try {
      const dbBooks = await bookRepository.findAll();
      setBooks(dbBooks.map(localToUi));
    } catch (error) {
      mobileHooks.emit(MOBILE_EVENTS.ERROR.STORAGE, {
        operation: 'load_books_from_db',
        error: error instanceof Error ? error.message : String(error),
        source: 'useBooks_loadBooksFromDB'
      });
    }
  };

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await bookAPI.getBooks();

      // Upsert server data into SQLite (prevents PRIMARY KEY conflicts)
      for (const book of response.books) {
        const uiBook = bookToUi(book as Book, {
          _syncStatus: SYNC_STATUS.SYNCED,
          _serverUpdatedAt: book.updateDate,
        });
        await bookRepository.upsert(uiToLocal(uiBook));
      }

      // Update local state
      setBooks(response.books.map(b => bookToUi(b as Book)));
    } catch (err: unknown) {
      console.error('Failed to load books:', err);
      setError(extractErrorMessage(err) || t('books.loadFailed'));

      // On error, load from local database
      await loadBooksFromDB();
    } finally {
      setLoading(false);
    }
  }, []);

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

  const refreshBooks = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response = await bookAPI.getBooks();

      // Upsert server data into SQLite (prevents PRIMARY KEY conflicts)
      for (const book of response.books) {
        const uiBook = bookToUi(book as Book, {
          _syncStatus: SYNC_STATUS.SYNCED,
          _serverUpdatedAt: book.updateDate,
        });
        await bookRepository.upsert(uiToLocal(uiBook));
      }

      // Update local state
      setBooks(response.books.map(b => bookToUi(b as Book)));
    } catch (err: unknown) {
      console.error('Failed to refresh books:', err);
      setError(extractErrorMessage(err) || t('books.refreshFailed'));

      // On error, load from local database
      await loadBooksFromDB();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const createBook = useCallback(async (bookData: CreateBookInput): Promise<UiBook> => {
    // Generate temporary ID for optimistic update
    const tempId = `temp-${uuidv4()}`;
    const { authorIds, categoryIds, ...bookPayload } = bookData;
    const optimisticBook = bookToUi(
      {
        ...(bookPayload as Book),
        id: -1,
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
      },
      {
        _tempId: tempId,
        _syncStatus: SYNC_STATUS.PENDING,
      }
    );

    // Add to SQLite and local state immediately (optimistic update)
    await bookRepository.create(uiToLocal(optimisticBook));
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
      const newUiBook = bookToUi(newBook as Book, {
        _tempId: tempId,
        _syncStatus: SYNC_STATUS.SYNCED,
        _serverUpdatedAt: (newBook as any)._serverUpdatedAt || newBook.updateDate || new Date().toISOString(),
        serverId: typeof newBook.id === 'number' ? newBook.id : undefined,
      });
      await bookRepository.create(uiToLocal(newUiBook));

      // Update local state
      setBooks(prev => prev.map(book =>
        book._tempId === tempId ? newUiBook : book
      ));

      return newUiBook;
    } catch (err: unknown) {
      console.error('Failed to create book:', err);

      // If error is retriable, keep optimistic book with pending status
      // Note: API service already handles queueing via withQueueOnError, so we don't queue again here
      if (isRetriableError(err)) {
        await bookRepository.update(tempId, { syncStatus: SYNC_STATUS.PENDING } as any);
        setBooks(prev => prev.map(book =>
          book._tempId === tempId ? { ...book, _syncStatus: SYNC_STATUS.PENDING } : book
        ));
        return optimisticBook;
      } else {
        // Non-retriable error - remove optimistic book
        await bookRepository.hardDelete(tempId);
        setBooks(prev => prev.filter(book => book._tempId !== tempId));
        console.error('Book creation error:', extractErrorMessage(err));
        throw new Error(t('books.createFailed'));
      }
    }
  }, []);

  const updateBook = useCallback(async (id: number | string, bookData: Partial<Book>): Promise<UiBook> => {
    // Store previous state for rollback
    const previousBook = books.find(book => book.id == id);
    if (!previousBook) {
      throw new Error(t('books.notFound'));
    }

    // Apply changes to SQLite and local state immediately (optimistic update)
    const stringId = String(id);
    const pendingBook: UiBook = {
      ...previousBook,
      ...bookData,
      _syncStatus: SYNC_STATUS.PENDING,
      updateDate: new Date().toISOString(),
      _rollbackData: {
        previousValues: {
          title: previousBook.title,
          status: previousBook.status,
          updateDate: previousBook.updateDate,
        },
      },
    };
    await bookRepository.update(stringId, uiToLocal(pendingBook));

    setBooks(prev => prev.map(book =>
      book.id == id ? pendingBook : book
    ));

    try {
      // Try to update on server
      const updatedBook = await bookAPI.updateBook(stringId, bookData);

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

      const updatedUi = bookToUi(updatedBook as Book, {
        _syncStatus: SYNC_STATUS.SYNCED,
        _serverUpdatedAt: updatedBook.updateDate,
        _hasConflict: hasConflict,
      });
      await bookRepository.update(stringId, uiToLocal(updatedUi));

      // Update local state
      setBooks(prev => prev.map(book =>
        book.id == id ? { 
          ...updatedUi
        } : book
      ));

      return updatedUi;
    } catch (err: unknown) {
      console.error('Failed to update book:', err);

      // If error is retriable, keep pending status  
      // Note: API service already handles queueing via withQueueOnError, so we don't queue again here
      if (isRetriableError(err)) {
        const pendingBook = books.find(b => b.id == id);
        if (pendingBook) {
          return { ...pendingBook, ...bookData, _syncStatus: SYNC_STATUS.PENDING };
        }
      } else {
        // Non-retriable error - rollback optimistic changes using stored rollback data
        if (pendingBook._rollbackData?.previousValues) {
          const rollback = {
            ...pendingBook,
            ...pendingBook._rollbackData.previousValues,
            _syncStatus: SYNC_STATUS.FAILED,
            _rollbackData: null,
          } as UiBook;
          await bookRepository.update(stringId, uiToLocal(rollback));
          setBooks(prev => prev.map(book =>
            book.id == id ? rollback : book
          ));
        } else {
          // Fallback: just mark as failed if no rollback data
          await bookRepository.update(stringId, { syncStatus: SYNC_STATUS.FAILED } as any);
          setBooks(prev => prev.map(book =>
            book.id == id ? { ...book, _syncStatus: SYNC_STATUS.FAILED } : book
          ));
        }
      }

      console.error('Book update error:', extractErrorMessage(err));
      throw new Error(t('books.updateFailed'));
    }
  }, [books]);

  const deleteBook = useCallback(async (id: number | string): Promise<void> => {
    const stringId = String(id);

    // Soft delete in SQLite and remove from local state immediately (optimistic)
      await bookRepository.delete(stringId);
    setBooks(prev => prev.filter(book => book.id != id));

    try {
      // Try to delete on server
      await bookAPI.deleteBook(stringId);

      // On success, permanently delete from SQLite
      await bookRepository.hardDelete(stringId);
    } catch (err: unknown) {
      console.error('Failed to delete book:', extractErrorMessage(err));

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
            'UPDATE books SET deleted = 0, sync_status = ? WHERE id = ?',
            [SYNC_STATUS.SYNCED, stringId]
          );
          await loadBooksFromDB(); // Reload to restore the book
        }
        throw new Error(t('books.deleteFailed'));
      }
    }
  }, []);

  const updateBookStatus = useCallback(async (id: number | string, status: Book['status']): Promise<void> => {
    const stringId = String(id);

    // Update SQLite and local state immediately (optimistic)
      await bookRepository.update(stringId, { syncStatus: SYNC_STATUS.PENDING } as any);
    setBooks(prev => prev.map(book =>
      book.id == id ? { ...book, status, _syncStatus: SYNC_STATUS.PENDING } : book
    ));

    try {
      // Try to update on server
      await bookAPI.updateBook(stringId, { status });

      // Mark as synced
      await bookRepository.update(stringId, { syncStatus: SYNC_STATUS.SYNCED } as any);
      setBooks(prev => prev.map(book =>
        book.id == id ? { ...book, _syncStatus: SYNC_STATUS.SYNCED } : book
      ));
    } catch (err: unknown) {
      console.error('Failed to update book status:', err);

      // If error is retriable, keep pending status
      // Note: API service already handles queueing via withQueueOnError, so we don't queue again here
      if (isRetriableError(err)) {
        // Already marked as pending
        return;
      } else {
        // Non-retriable error - mark as failed
        await bookRepository.update(stringId, { syncStatus: SYNC_STATUS.FAILED } as any);
        setBooks(prev => prev.map(book =>
          book.id == id ? { ...book, _syncStatus: SYNC_STATUS.FAILED } : book
        ));
        const details = extractErrorDetails(err);
        mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
          operation: OPERATION_TYPES.UPDATE,
          resource: RESOURCE_TYPES.BOOK,
          error: details.backendError || details.message,
          statusCode: details.status,
          source: 'useBooks_updateBookStatus'
        });
        throw new Error(t('books.updateStatusFailed'));
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
        const updatedUi: UiBook = {
          ...conflictedBook,
          _syncStatus: SYNC_STATUS.PENDING,
          _hasConflict: false,
        };
        await bookRepository.update(stringId, uiToLocal(updatedUi));

        setBooks(prev => prev.map(book =>
          book.id == bookId ? { 
            ...book, 
            _syncStatus: SYNC_STATUS.PENDING, 
            _hasConflict: false 
          } : book
        ));

        // CRITICAL FIX: Queue the update operation so server receives the conflict resolution
        try {
          await bookAPI.updateBook(stringId, conflictedBook);
          console.log(`Conflict resolved for book ${bookId}: keeping local version - update sent to server`);
        } catch {
          console.log(`Conflict resolved for book ${bookId}: keeping local version - will retry via queue`);
          // If immediate update fails, it's already marked as pending and will be queued automatically
        }
        
      } else {
        // Use server version - need to fetch latest from server
        const numericId = Number(bookId);
        const serverBook = await bookAPI.getBook(numericId);
        const resolvedLocal = resolveBookConflict(uiToLocal(conflictedBook), serverBook, 'server');
        const resolvedUi = bookToUi(resolvedLocal.entity as Book, {
          _syncStatus: resolvedLocal.syncStatus,
          _serverUpdatedAt: resolvedLocal.serverUpdatedAt || serverBook.updateDate,
          _hasConflict: false,
          _tempId: conflictedBook._tempId,
          serverId: resolvedLocal.serverId ?? conflictedBook.serverId ?? (typeof resolvedLocal.entity.id === 'number' ? resolvedLocal.entity.id : undefined),
        });
        
        await bookRepository.update(stringId, uiToLocal(resolvedUi));

        setBooks(prev => prev.map(book =>
          book.id == bookId ? resolvedUi : book
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
    loadBooks,
    refreshBooks,
    createBook,
    updateBook,
    deleteBook,
    updateBookStatus,
    resolveConflict,
  };
};
