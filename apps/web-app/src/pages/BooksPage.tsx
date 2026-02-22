import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, IconButton, Chip, Container, Typography, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import ClearIcon from '@mui/icons-material/Clear';
import GridIcon from '@mui/icons-material/ViewModule';
import ListIcon from '@mui/icons-material/ViewList';
import { useTranslation } from 'react-i18next';
import type { Book, BookFormData as SharedBookFormInput, BookStatusChangeBehavior } from '@my-many-books/shared-types';
import { SETTING_KEYS, BOOK_STATUS_CHANGE_BEHAVIOR } from '@my-many-books/shared-types';
import { BookList, BookForm, BookDetails, type BookFormData } from '../components/Book';
import { BookSearchForm } from '../components/Search';
import { useBookSearch } from '../hooks/useBookSearch';
import { useBooks } from '../hooks/useBooks';
import { useSetting } from '../hooks/useSetting';
import { ADD_BOOK_SCANNER_DRAFT_STORAGE_KEY } from '../constants/scanner';

type ViewMode = 'list' | 'grid';
type PageMode = 'list' | 'add' | 'edit' | 'details';

const BooksPage: React.FC = () => {
  const { t } = useTranslation(['pages', 'scanner']);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [pageMode, setPageMode] = useState<PageMode>('list');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [initialIsbn, setInitialIsbn] = useState<string | undefined>(undefined);
  const [initialDraft, setInitialDraft] = useState<Partial<BookFormData> | null>(null);
  const [scannerNoticeOpen, setScannerNoticeOpen] = useState(false);
  const [scannerNoticeMessage, setScannerNoticeMessage] = useState('');

  // Get setting for book status change behavior
  const { value: statusChangeBehavior } = useSetting<BookStatusChangeBehavior>(
    SETTING_KEYS.BOOKS.LIST.STATUS.ONCHANGE
  );

  const {
    books: searchResults,
    loading: searchLoading,
    error: searchError,
    totalCount: searchTotalCount,
    hasMore: searchHasMore,
    searchBooks,
    loadMore: loadMoreSearch,
    clearSearch
  } = useBookSearch();

  const {
    books: libraryBooks,
    loading: booksLoading,
    error: booksError,
    totalCount: booksTotalCount,
    hasMore: booksHasMore,
    loadBooks,
    loadMore: loadMoreBooks,
    createBook: createBookEntry,
    updateBook: updateBookEntry,
    deleteBook: deleteBookEntry,
    updateBookStatus: updateBookStatusEntry,
    refreshBooks,
  } = useBooks({ autoLoad: false });

  const searchCategoryId = searchParams.get('categoryId');
  const searchAuthorId = searchParams.get('authorId');
  const searchSortBy = searchParams.get('sortBy');
  const searchStatus = searchParams.get('status');
  const searchModeParam = searchParams.get('mode');
  const searchQuery = searchParams.get('q') || '';
  const searchActive = Boolean(searchQuery || searchCategoryId || searchAuthorId || searchSortBy || searchStatus);

  const runCurrentSearch = useCallback(async () => {
    const query = searchParams.get('q') || '';
    const filters: any = {};
    const categoryId = searchParams.get('categoryId');
    const authorId = searchParams.get('authorId');
    const sortBy = searchParams.get('sortBy');
    const status = searchParams.get('status');

    if (categoryId) filters.categoryId = parseInt(categoryId);
    if (authorId) filters.authorId = parseInt(authorId);
    if (sortBy) filters.sortBy = sortBy;
    if (status) filters.status = status;

    await searchBooks(query, filters);
  }, [searchParams, searchBooks]);

  useEffect(() => {
    if (searchModeParam === 'add') {
      const isbnFromUrl = searchParams.get('isbn') || undefined;
      const scannerSource = searchParams.get('scannerSource');
      const scannerCopy = searchParams.get('scannerCopy');
      const restoreDraft = searchParams.get('restoreDraft') === '1' || scannerSource === 'scanner';
      let restoredDraft: Partial<BookFormData> | null = null;

      if (restoreDraft) {
        try {
          const storedDraft = window.sessionStorage.getItem(ADD_BOOK_SCANNER_DRAFT_STORAGE_KEY);
          if (storedDraft) {
            restoredDraft = JSON.parse(storedDraft) as Partial<BookFormData>;
          }
        } catch {
          restoredDraft = null;
        } finally {
          try {
            window.sessionStorage.removeItem(ADD_BOOK_SCANNER_DRAFT_STORAGE_KEY);
          } catch {
            // ignore storage cleanup failures
          }
        }
      }

      setInitialDraft(restoredDraft);
      setInitialIsbn(isbnFromUrl);
      if (scannerSource === 'scanner') {
        setScannerNoticeMessage(
          scannerCopy === 'success'
            ? t('isbn_copied', { ns: 'scanner', defaultValue: 'ISBN copied' })
            : t('isbn_detected', { ns: 'scanner', defaultValue: 'ISBN detected' })
        );
        setScannerNoticeOpen(true);
      }
      handleAddBook();
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('mode');
      newParams.delete('isbn');
      newParams.delete('scannerSource');
      newParams.delete('scannerCopy');
      newParams.delete('restoreDraft');
      setSearchParams(newParams, { replace: true });
      return;
    }

    if (searchActive) {
      runCurrentSearch();
      return;
    }

    clearSearch();
    loadBooks(1);
  }, [searchActive, searchModeParam, searchParams, setSearchParams, runCurrentSearch, clearSearch, loadBooks]);

  const displayedBooks = searchActive ? searchResults : libraryBooks;
  const displayedLoading = searchActive ? searchLoading : booksLoading;
  const displayedError = searchActive ? searchError : booksError;
  const displayedTotalCount = searchActive ? searchTotalCount : booksTotalCount;
  const displayedHasMore = searchActive ? searchHasMore : booksHasMore;
  const displayedLoadMore = searchActive ? loadMoreSearch : loadMoreBooks;
  const combinedError = actionError || displayedError;

  const handleSearch = (query: string, filters: any) => {
    // Update URL params
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set('q', query.trim());
    }
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.set(key, value.toString());
      }
    });

    setSearchParams(params);
  };

  const handleAddBook = () => {
    setSelectedBook(null);
    setPageMode('add');
    setActionError(null);
  };

  const handleScanIsbn = () => {
    navigate('/scanner');
  };

  const handleEditBook = (book: Book) => {
    setSelectedBook(book);
    setPageMode('edit');
  };

  const handleViewDetails = (book: Book) => {
    setSelectedBook(book);
    setPageMode('details');
    setActionError(null);
  };

  const handleDeleteBook = async (bookId: number) => {
    setActionLoading(true);
    setActionError(null);

    try {
      const deleted = await deleteBookEntry(bookId);
      if (!deleted) {
        throw new Error('Failed to delete book');
      }

      if (searchActive) {
        await runCurrentSearch();
      } else {
        await refreshBooks();
      }

      if (selectedBook?.id === bookId) {
        setPageMode('list');
        setSelectedBook(null);
      }
    } catch (err: any) {
      console.error('Failed to delete book:', err);
      setActionError(err.response?.data?.message || err.message || 'Failed to delete book');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (bookId: number, status: Book['status']) => {
    try {
      await updateBookStatusEntry(bookId, status);

      if (selectedBook?.id === bookId) {
        setSelectedBook(prev => (prev ? { ...prev, status } : null));
      }

      // Apply behavior based on setting
      const behavior = statusChangeBehavior || BOOK_STATUS_CHANGE_BEHAVIOR.REMOVE;

      if (behavior === BOOK_STATUS_CHANGE_BEHAVIOR.REMOVE) {
        // Remove behavior: The book removal is handled by the useBooks hook
        // which will automatically update the books state after updateBookStatus
        // No additional action needed - the book is removed from the list
      } else if (behavior === BOOK_STATUS_CHANGE_BEHAVIOR.REFRESH) {
        // Refresh behavior: Reload the entire list from the server
        if (searchActive) {
          await runCurrentSearch();
        } else {
          await refreshBooks();
        }
      }
      // KEEP behavior: do nothing, book stays in list with updated status
      // The useBooks hook will update the book status in place
    } catch (err: any) {
      console.error('Failed to update book status:', err);
      setActionError(err.response?.data?.message || err.message || 'Failed to update book status');
    }
  };

  const buildSharedPayload = (formData: BookFormData): SharedBookFormInput => ({
    title: formData.title,
    isbnCode: formData.isbnCode,
    editionNumber: formData.editionNumber,
    editionDate: formData.editionDate,
    status: formData.status,
    notes: formData.notes,
    authorIds: formData.selectedAuthors?.map(author => author.id),
    categoryIds: formData.selectedCategories,
  });

  const handleFormSubmit = async (formData: BookFormData) => {
    setActionLoading(true);
    setActionError(null);

    try {
      const payload = buildSharedPayload(formData);

      if (selectedBook) {
        await updateBookEntry(selectedBook.id, payload);
      } else {
        await createBookEntry(payload);
      }

      if (searchActive) {
        await runCurrentSearch();
      } else {
        await refreshBooks();
      }

      setPageMode('list');
      setSelectedBook(null);
      setInitialIsbn(undefined);
      setInitialDraft(null);
    } catch (err: any) {
      console.error('Failed to save book:', err);
      const errorData = err.response?.data;
      const errorMessage = errorData?.error || errorData?.message || 'Failed to save book';
      const errorDetails = errorData?.details || [];

      // Format validation errors with field names
      if (errorDetails.length > 0) {
        const formattedErrors = errorDetails.map((detail: any) =>
          `${detail.field}: ${detail.message}`
        ).join('\n');
        setActionError(formattedErrors);
      } else {
        setActionError(errorMessage);
      }

      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = () => {
    setPageMode('list');
    setSelectedBook(null);
    setActionError(null);
    setInitialIsbn(undefined);
    setInitialDraft(null);
  };

  const handleScannerPrefillNoticeDismiss = useCallback(() => {
    setScannerNoticeOpen(false);
    setScannerNoticeMessage('');
  }, []);

  const visuallyHidden = {
    border: 0,
    clip: 'rect(0 0 0 0)',
    height: 1,
    margin: -1,
    overflow: 'hidden',
    padding: 0,
    position: 'absolute' as const,
    width: 1,
  };

  // Render different modes
  if (pageMode === 'add' || pageMode === 'edit') {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <BookForm
          book={selectedBook}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          loading={actionLoading}
          initialIsbn={initialIsbn}
          initialDraft={initialDraft}
          scannerPrefillNotice={pageMode === 'add' && scannerNoticeOpen ? scannerNoticeMessage : null}
          onScannerPrefillNoticeDismiss={handleScannerPrefillNoticeDismiss}
        />
        {actionError && (
          <Alert severity="error" sx={{ mt: 3, whiteSpace: 'pre-line' }}>
            {actionError}
          </Alert>
        )}
      </Container>
    );
  }

  if (pageMode === 'details' && selectedBook) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <BookDetails
          book={selectedBook}
          onEdit={handleEditBook}
          onDelete={handleDeleteBook}
          onStatusChange={handleStatusChange}
          onClose={() => setPageMode('list')}
          loading={actionLoading}
        />
        {actionError && (
          <Alert severity="error" sx={{ mt: 3, whiteSpace: 'pre-line' }}>
            {actionError}
          </Alert>
        )}
      </Container>
    );
  }

  // List mode (default)
  return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      {/* Page header */}
      <Box
        mb={{ xs: 3, sm: 6 }}
        display="flex"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('pages:books.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {displayedTotalCount > 0 ? t('pages:books.description_with_count', { count: displayedTotalCount }) : t('pages:books.description')}
          </Typography>
        </Box>

        <Box
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
          gap={2}
          width={{ xs: '100%', sm: 'auto' }}
        >
          <Button
            variant="contained"
            startIcon={<AddIcon aria-hidden="true" />}
            onClick={handleAddBook}
            size="large"
            aria-label={t('pages:books.add_book')}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {t('pages:books.add_book')}
            </Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              {t('pages:books.add')}
            </Box>
          </Button>

          <Button
            variant="outlined"
            startIcon={<QrCodeScannerIcon aria-hidden="true" />}
            onClick={handleScanIsbn}
            size="large"
            aria-label={t('pages:books.scan_isbn')}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {t('pages:books.scan_isbn')}
          </Button>
        </Box>
      </Box>

      {/* Search and filters */}
      <Box mb={{ xs: 3, sm: 6 }}>
        <BookSearchForm
          onSearch={handleSearch}
          loading={searchLoading}
          initialQuery={searchParams.get('q') || ''}
        />
      </Box>

      {/* View controls */}
      <Box mb={{ xs: 3, sm: 4 }} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          {searchActive && (
            <Chip
              icon={<ClearIcon />}
              label={t('pages:books.clear_search')}
              onClick={() => {
                setSearchParams({});
                clearSearch();
                setActionError(null);
              }}
              onDelete={() => {
                setSearchParams({});
                clearSearch();
                setActionError(null);
              }}
              color="secondary"
              variant="outlined"
              size="small"
            />
          )}
        </Box>

        <Box display="flex" gap={1}>
          <IconButton
            onClick={() => setViewMode('grid')}
            color={viewMode === 'grid' ? 'primary' : 'default'}
            title={t('pages:books.grid_view')}
            aria-label={t('pages:books.grid_view')}
            size="small"
          >
            <GridIcon aria-hidden="true" />
          </IconButton>

          <IconButton
            onClick={() => setViewMode('list')}
            color={viewMode === 'list' ? 'primary' : 'default'}
            title={t('pages:books.list_view')}
            aria-label={t('pages:books.list_view')}
            size="small"
          >
            <ListIcon aria-hidden="true" />
          </IconButton>
        </Box>
      </Box>

      {/* Screen reader announcements for list updates */}
      <Box role="status" aria-live="polite" sx={visuallyHidden}>
        {displayedLoading
          ? t('pages:books.loading')
          : displayedTotalCount > 0
          ? `${displayedTotalCount} ${t('pages:books.books_found')}`
          : t('pages:books.no_books_empty')}
      </Box>

      {/* Books list */}
      <BookList
        books={displayedBooks}
        loading={displayedLoading}
        error={combinedError}
        viewMode={viewMode}
        onEdit={handleEditBook}
        onDelete={handleDeleteBook}
        onStatusChange={handleStatusChange}
        onBookClick={handleViewDetails}
        emptyMessage={searchParams.get('q') ? t('pages:books.no_books_search') : t('pages:books.no_books_empty')}
      />

      {/* Load more */}
      {displayedHasMore && (
        <Box mt={4} textAlign="center">
          <Button
            variant="contained"
            onClick={() => displayedLoadMore()}
            disabled={displayedLoading}
            size="large"
          >
            {searchLoading ? t('pages:books.loading') : t('pages:books.load_more')}
          </Button>
        </Box>
      )}
    </Container>
  );
};
export default BooksPage;
