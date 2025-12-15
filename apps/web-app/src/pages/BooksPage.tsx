import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Button, IconButton, Chip, Container, Typography, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import GridIcon from '@mui/icons-material/ViewModule';
import ListIcon from '@mui/icons-material/ViewList';
import { useTranslation } from 'react-i18next';
import type { BookFormData as SharedBookFormInput } from '@my-many-books/shared-types';
import { Book } from '../types';
import { BookList, BookForm, BookDetails, type BookFormData } from '../components/Book';
import { BookSearchForm } from '../components/Search';
import { useBookSearch } from '../hooks/useBookSearch';
import { useBooks } from '../hooks/useBooks';

type ViewMode = 'list' | 'grid';
type PageMode = 'list' | 'add' | 'edit' | 'details';

const BooksPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const [searchParams, setSearchParams] = useSearchParams();

  const [pageMode, setPageMode] = useState<PageMode>('list');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
  const searchModeParam = searchParams.get('mode');
  const searchQuery = searchParams.get('q') || '';
  const searchActive = Boolean(searchQuery || searchCategoryId || searchAuthorId || searchSortBy);

  const runCurrentSearch = useCallback(async () => {
    const query = searchParams.get('q') || '';
    const filters: any = {};
    const categoryId = searchParams.get('categoryId');
    const authorId = searchParams.get('authorId');
    const sortBy = searchParams.get('sortBy');

    if (categoryId) filters.categoryId = parseInt(categoryId);
    if (authorId) filters.authorId = parseInt(authorId);
    if (sortBy) filters.sortBy = sortBy;

    await searchBooks(query, filters);
  }, [searchParams, searchBooks]);

  useEffect(() => {
    if (searchModeParam === 'add') {
      handleAddBook();
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('mode');
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
    if (query.trim()) params.set('q', query);
    
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
    setActionLoading(true);
    setActionError(null);

    try {
      await updateBookStatusEntry(bookId, status);

      if (searchActive) {
        await runCurrentSearch();
      } else {
        await refreshBooks();
      }

      if (selectedBook?.id === bookId) {
        setSelectedBook(prev => (prev ? { ...prev, status } : null));
      }
    } catch (err: any) {
      console.error('Failed to update book status:', err);
      setActionError(err.response?.data?.message || err.message || 'Failed to update book status');
    } finally {
      setActionLoading(false);
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
  };

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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page header */}
      <Box mb={6} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('pages:books.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {displayedTotalCount > 0 ? t('pages:books.description_with_count', { count: displayedTotalCount }) : t('pages:books.description')}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon aria-hidden="true" />}
          onClick={handleAddBook}
          size="large"
          aria-label={t('pages:books.add_book')}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            {t('pages:books.add_book')}
          </Box>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
            {t('pages:books.add')}
          </Box>
        </Button>
      </Box>

      {/* Search and filters */}
      <Box mb={6}>
        <BookSearchForm
          onSearch={handleSearch}
          loading={searchLoading}
          initialQuery={searchParams.get('q') || ''}
        />
      </Box>

      {/* View controls */}
      <Box mb={4} display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
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
