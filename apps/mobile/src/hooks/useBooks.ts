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
import { createDomainMutationPayload, emitDomainMutationLifecycle } from '@/services/hooks/domainMutationEvents';
import { LocalBook } from '@/entities/LocalBook';

import { EntityMeta, UiBook } from '@/types/ui';

type CreateBookInput = Partial<BookFormData> & { meta?: Partial<EntityMeta>; id?: string | number };

const bookToUi = (book: Book, meta: Partial<EntityMeta> = {}): UiBook => ({
  ...book,
  meta: {
    tempId: meta.tempId,
    syncStatus: meta.syncStatus ?? SYNC_STATUS.SYNCED,
    serverUpdatedAt: meta.serverUpdatedAt ?? (book.updateDate as string | undefined),
    hasConflict: meta.hasConflict,
    serverId: meta.serverId,
    rollbackData: meta.rollbackData ?? null,
  },
});

const localToUi = (local: LocalBook): UiBook =>
  bookToUi(local.entity, {
    tempId: local.tempId,
    syncStatus: local.syncStatus,
    serverUpdatedAt: local.serverUpdatedAt,
    serverId: local.serverId,
  });

const uiToLocal = (ui: UiBook): LocalBook => {
  const { meta, ...book } = ui;
  const local = new LocalBook(book as Book);
  local.tempId = meta?.tempId;
  local.syncStatus = meta?.syncStatus ?? SYNC_STATUS.SYNCED;
  local.serverUpdatedAt = meta?.serverUpdatedAt;
  local.serverId = meta?.serverId;
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

  const loadBooksFromDB = useCallback(async () => {
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
  }, []);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await bookAPI.getBooks();

      // Upsert server data into SQLite (prevents PRIMARY KEY conflicts)
      for (const book of response.books) {
        const uiBook = bookToUi(book as Book, {
          syncStatus: SYNC_STATUS.SYNCED,
          serverUpdatedAt: book.updateDate,
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
  }, [t, loadBooksFromDB]);

  const initDatabase = useCallback(async () => {
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
  }, [loadBooksFromDB, loadBooks, t]);

  useEffect(() => {
    initDatabase();
  }, [initDatabase]);

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
  }, [isOnline, loadBooks, loadBooksFromDB]);

  const refreshBooks = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response = await bookAPI.getBooks();

      // Upsert server data into SQLite (prevents PRIMARY KEY conflicts)
      for (const book of response.books) {
        const uiBook = bookToUi(book as Book, {
          syncStatus: SYNC_STATUS.SYNCED,
          serverUpdatedAt: book.updateDate,
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
  }, [t, loadBooksFromDB]);

  const createBook = useCallback(async (bookData: CreateBookInput): Promise<UiBook> => {
    // Generate temporary ID for optimistic update
    const tempId = `temp-${uuidv4()}`;
    const { meta: incomingMeta, id: _localId, ...bookPayload } = bookData;
    const optimisticBook = bookToUi(
      {
        ...(bookPayload as Book),
        id: -1,
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
      },
      {
        tempId: tempId,
        syncStatus: SYNC_STATUS.PENDING,
        ...incomingMeta,
      }
    );

    // Add to SQLite and local state immediately (optimistic update)
    await bookRepository.create(uiToLocal(optimisticBook));
    setBooks(prev => [optimisticBook, ...prev]);

    try {
      // Try to create on server - include temp ID for queue processing
      const newBook = await emitDomainMutationLifecycle(
        MOBILE_EVENTS.BOOK.CREATE,
        createDomainMutationPayload(RESOURCE_TYPES.BOOK, { tempId, input: bookPayload }),
        () => bookAPI.createBook({ ...(bookPayload as BookFormData), _tempId: tempId }),
        (book) => ({ result: { book } })
      );

      // Replace temp book with real book from server in SQLite
      await bookRepository.hardDelete(tempId);
      const serverBook = newBook as Book & { _serverUpdatedAt?: string };
      const newUiBook = bookToUi(serverBook, {
        tempId: tempId,
        syncStatus: SYNC_STATUS.SYNCED,
        serverUpdatedAt: serverBook._serverUpdatedAt || serverBook.updateDate || new Date().toISOString(),
        serverId: typeof serverBook.id === 'number' ? serverBook.id : undefined,
      });
      await bookRepository.create(uiToLocal(newUiBook));

      // Update local state
      setBooks(prev => prev.map(book =>
        book.meta.tempId === tempId ? newUiBook : book
      ));

      return newUiBook;
    } catch (err: unknown) {
      console.error('Failed to create book:', err);

      // If error is retriable, keep optimistic book with pending status
      // Note: API service already handles queueing via withQueueOnError, so we don't queue again here
      if (isRetriableError(err)) {
          await bookRepository.updateSyncFields(tempId, { syncStatus: SYNC_STATUS.PENDING });
          setBooks(prev => prev.map(book =>
            book.meta.tempId === tempId ? { ...book, meta: { ...book.meta, syncStatus: SYNC_STATUS.PENDING } } : book
          ));
        return optimisticBook;
      } else {
        // Non-retriable error - remove optimistic book
        await bookRepository.hardDelete(tempId);
        setBooks(prev => prev.filter(book => book.meta.tempId !== tempId));
        console.error('Book creation error:', extractErrorMessage(err));
        throw new Error(t('books.createFailed'));
      }
    }
  }, [t]);

  const updateBook = useCallback(async (id: number | string, bookData: Partial<Book>): Promise<UiBook> => {
    // Store previous state for rollback
    const previousBook = books.find(book => String(book.id) === String(id));
    if (!previousBook) {
      throw new Error(t('books.notFound'));
    }

    // Apply changes to SQLite and local state immediately (optimistic update)
    const stringId = String(id);
    const pendingBook: UiBook = {
      ...previousBook,
      ...bookData,
      meta: {
        ...previousBook.meta,
        syncStatus: SYNC_STATUS.PENDING,
        rollbackData: {
          previousValues: {
            title: previousBook.title,
            status: previousBook.status,
            updateDate: previousBook.updateDate,
          },
        },
      },
      updateDate: new Date().toISOString(),
    };
    await bookRepository.update(stringId, uiToLocal(pendingBook));

    setBooks(prev => prev.map(book =>
      String(book.id) === stringId ? pendingBook : book
    ));

    try {
      // Try to update on server
      const updatedBook = await emitDomainMutationLifecycle(
        MOBILE_EVENTS.BOOK.UPDATE,
        createDomainMutationPayload(RESOURCE_TYPES.BOOK, { bookId: stringId, changes: bookData }),
        () => bookAPI.updateBook(stringId, bookData),
        (book) => ({ result: { book } })
      );

      // Update with server response and check for conflicts
      const optimisticBook = books.find(b => String(b.id) === stringId);
      const serverUpdatedAt = new Date(updatedBook.updateDate);
      const localUpdatedAt = optimisticBook ? new Date(optimisticBook.updateDate) : new Date();
      
      // Simple conflict detection: if server version is newer than our optimistic update
      const hasConflict = serverUpdatedAt > localUpdatedAt && 
                         previousBook.meta.serverUpdatedAt && 
                         new Date(previousBook.meta.serverUpdatedAt) < serverUpdatedAt;

      if (hasConflict) {
          console.warn('Conflict detected for book update:', {
            bookId: id,
            serverVersion: updatedBook.updateDate,
            localVersion: optimisticBook?.updateDate,
            lastKnownServer: previousBook.meta.serverUpdatedAt
          });
        }

      const updatedUi = bookToUi(updatedBook as Book, {
        syncStatus: SYNC_STATUS.SYNCED,
        serverUpdatedAt: updatedBook.updateDate,
        hasConflict,
      });
      await bookRepository.update(stringId, uiToLocal(updatedUi));

      // Update local state
      setBooks(prev => prev.map(book =>
        String(book.id) === stringId ? updatedUi : book
      ));

      return updatedUi;
    } catch (err: unknown) {
      console.error('Failed to update book:', err);

      // If error is retriable, keep pending status  
      // Note: API service already handles queueing via withQueueOnError, so we don't queue again here
      if (isRetriableError(err)) {
        const pendingBook = books.find(b => String(b.id) === stringId);
        if (pendingBook) {
          return { ...pendingBook, ...bookData, meta: { ...pendingBook.meta, syncStatus: SYNC_STATUS.PENDING } };
        }
      } else {
        // Non-retriable error - rollback optimistic changes using stored rollback data
        if (pendingBook.meta.rollbackData?.previousValues) {
          const rollback = {
            ...pendingBook,
            ...pendingBook.meta.rollbackData.previousValues,
            meta: { ...pendingBook.meta, syncStatus: SYNC_STATUS.FAILED, rollbackData: null },
          } as UiBook;
          await bookRepository.update(stringId, uiToLocal(rollback));
          setBooks(prev => prev.map(book =>
            String(book.id) === stringId ? rollback : book
          ));
        } else {
          // Fallback: just mark as failed if no rollback data
          await bookRepository.updateSyncFields(stringId, { syncStatus: SYNC_STATUS.FAILED });
          setBooks(prev => prev.map(book =>
            String(book.id) === stringId ? { ...book, meta: { ...book.meta, syncStatus: SYNC_STATUS.FAILED } } : book
          ));
        }
      }

      console.error('Book update error:', extractErrorMessage(err));
      throw new Error(t('books.updateFailed'));
    }
  }, [books, t]);

  const deleteBook = useCallback(async (id: number | string): Promise<void> => {
    const stringId = String(id);

    // Soft delete in SQLite and remove from local state immediately (optimistic)
      await bookRepository.delete(stringId);
    setBooks(prev => prev.filter(book => String(book.id) !== stringId));

    try {
      // Try to delete on server
      await emitDomainMutationLifecycle<void>(
        MOBILE_EVENTS.BOOK.DELETE,
        createDomainMutationPayload(RESOURCE_TYPES.BOOK, { bookId: stringId }),
        () => bookAPI.deleteBook(stringId)
      );

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
  }, [t, loadBooksFromDB]);

  const updateBookStatus = useCallback(async (id: number | string, status: Book['status']): Promise<void> => {
    const stringId = String(id);
    const previousBook = books.find(book => String(book.id) === stringId);
    const previousStatus = previousBook?.status ?? null;

    // Update SQLite and local state immediately (optimistic)
      await bookRepository.updateSyncFields(stringId, { syncStatus: SYNC_STATUS.PENDING });
    setBooks(prev => prev.map(book =>
      String(book.id) === stringId ? { ...book, status, meta: { ...book.meta, syncStatus: SYNC_STATUS.PENDING } } : book
    ));

    try {
      const updatedBook = await emitDomainMutationLifecycle(
        MOBILE_EVENTS.BOOK.STATUS.CHANGE,
        createDomainMutationPayload(RESOURCE_TYPES.BOOK, {
          bookId: stringId,
          previousStatus,
          nextStatus: status,
        }),
        () => bookAPI.updateBookStatus(Number(stringId), status),
        (book) => ({
          result: {
            book,
            previousStatus,
            newStatus: book.status ?? null,
          },
        })
      );

      // Mark as synced
      await bookRepository.updateSyncFields(stringId, { syncStatus: SYNC_STATUS.SYNCED });
      setBooks(prev => prev.map(book =>
        String(book.id) === stringId
          ? {
              ...book,
              status: updatedBook.status,
              updateDate: updatedBook.updateDate,
              meta: {
                ...book.meta,
                syncStatus: SYNC_STATUS.SYNCED,
                serverUpdatedAt: updatedBook.updateDate,
              },
            }
          : book
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
        await bookRepository.updateSyncFields(stringId, { syncStatus: SYNC_STATUS.FAILED });
        setBooks(prev => prev.map(book =>
          String(book.id) === stringId ? { ...book, meta: { ...book.meta, syncStatus: SYNC_STATUS.FAILED } } : book
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
  }, [books, t]);

  const resolveConflict = useCallback(async (bookId: number | string, choice: 'local' | 'server'): Promise<void> => {
    const stringId = String(bookId);
    const conflictedBook = books.find(book => String(book.id) === stringId);
    
    if (!conflictedBook || !conflictedBook.meta.hasConflict) {
      throw new Error(t('conflicts.notFound'));
    }

    try {
      let resultingSyncStatus: string = conflictedBook.meta.syncStatus;

      if (choice === 'local') {
        // Keep local version, mark for re-sync to server
        const updatedUi: UiBook = {
          ...conflictedBook,
          meta: { ...conflictedBook.meta, syncStatus: SYNC_STATUS.PENDING, hasConflict: false },
        };
        await bookRepository.update(stringId, uiToLocal(updatedUi));

        setBooks(prev => prev.map(book =>
          String(book.id) === stringId ? {
            ...book,
            meta: { ...book.meta, syncStatus: SYNC_STATUS.PENDING, hasConflict: false }
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

        resultingSyncStatus = SYNC_STATUS.PENDING;
      } else {
        // Use server version - need to fetch latest from server
        const numericId = Number(bookId);
        const serverBook = await bookAPI.getBook(numericId);
        const resolvedLocal = resolveBookConflict(uiToLocal(conflictedBook), serverBook, 'server');
        const resolvedUi = bookToUi(resolvedLocal.entity as Book, {
          syncStatus: resolvedLocal.syncStatus,
          serverUpdatedAt: resolvedLocal.serverUpdatedAt || serverBook.updateDate,
          hasConflict: false,
          tempId: conflictedBook.meta.tempId,
          serverId: resolvedLocal.serverId ?? conflictedBook.meta.serverId ?? (typeof resolvedLocal.entity.id === 'number' ? resolvedLocal.entity.id : undefined),
        });
        
        await bookRepository.update(stringId, uiToLocal(resolvedUi));

        setBooks(prev => prev.map(book =>
          String(book.id) === stringId ? resolvedUi : book
        ));

        console.log(`Conflict resolved for book ${bookId}: using server version`);
        resultingSyncStatus = resolvedUi.meta.syncStatus;
      }

      mobileHooks.emit(MOBILE_EVENTS.BOOK.SYNC.CONFLICT.USER_RESOLVED, {
        bookId: stringId,
        choice,
        previousSyncStatus: conflictedBook.meta.syncStatus,
        resultingSyncStatus,
        source: 'useBooks.resolveConflict',
      });
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw new Error(t('conflicts.resolutionFailed'));
    }
  }, [books, t]);

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
