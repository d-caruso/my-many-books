import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Button, IconButton, Chip } from '@mui/material';
import { Add as AddIcon, Clear as ClearIcon, ViewModule as GridIcon, ViewList as ListIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Book } from '../types';
import { BookList, BookForm, BookDetails, type BookFormData } from '../components/Book';
import { BookSearchForm } from '../components/Search';
import { useBookSearch } from '../hooks/useBookSearch';
import { useApi } from '../contexts/ApiContext';

type ViewMode = 'list' | 'grid';
type PageMode = 'list' | 'add' | 'edit' | 'details';

const BooksPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { bookAPI } = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  // const navigate = useNavigate(); // Commented out as currently unused

  const [pageMode, setPageMode] = useState<PageMode>('list');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    books,
    loading: searchLoading,
    error: searchError,
    totalCount,
    hasMore,
    searchBooks,
    loadMore,
    clearSearch
  } = useBookSearch();

  // Use refs to store the latest functions to avoid dependency issues
  const searchBooksRef = useRef(searchBooks);
  const loadUserBooksRef = useRef<(() => Promise<void>) | null>(null);

  searchBooksRef.current = searchBooks;

  const loadUserBooks = useCallback(async () => {
    try {
      // For now, we'll use the search with empty query to get all books
      searchBooksRef.current('', {});
    } catch (err: any) {
      console.error('Failed to load user books:', err);
      setError(t('books.error_load_books'));
    }
  }, [t]);

  loadUserBooksRef.current = loadUserBooks;

  // Initialize with user's books or search params
  useEffect(() => {
    const query = searchParams.get('q');
    const categoryId = searchParams.get('categoryId');
    const authorId = searchParams.get('authorId');
    const sortBy = searchParams.get('sortBy');
    const mode = searchParams.get('mode');

    // Handle mode changes
    if (mode === 'add') {
      handleAddBook();
      // Remove mode param to clean URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('mode');
      setSearchParams(newParams, { replace: true });
      return;
    }

    if (query || categoryId || authorId || sortBy) {
      const filters: any = {};
      if (categoryId) filters.categoryId = parseInt(categoryId);
      if (authorId) filters.authorId = parseInt(authorId);
      if (sortBy) filters.sortBy = sortBy;
      searchBooksRef.current(query || '', filters);
    } else {
      // Load user's books by default
      loadUserBooksRef.current?.();
    }
  }, [searchParams, setSearchParams]);

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
  };

  const handleEditBook = (book: Book) => {
    setSelectedBook(book);
    setPageMode('edit');
  };

  const handleViewDetails = (book: Book) => {
    setSelectedBook(book);
    setPageMode('details');
  };

  const handleDeleteBook = async (bookId: number) => {
    setLoading(true);
    setError(null);

    try {
      await bookAPI.deleteBook(bookId);
      
      // Refresh the book list
      const query = searchParams.get('q');
      const categoryId = searchParams.get('categoryId');
      const authorId = searchParams.get('authorId');
      const sortBy = searchParams.get('sortBy');
      
      if (query || categoryId || authorId || sortBy) {
        const filters: any = {};
        if (categoryId) filters.categoryId = parseInt(categoryId);
        if (authorId) filters.authorId = parseInt(authorId);
        if (sortBy) filters.sortBy = sortBy;
        await searchBooks(query || '', filters);
      } else {
        await loadUserBooks();
      }

      // Close details if we were viewing the deleted book
      if (selectedBook?.id === bookId) {
        setPageMode('list');
        setSelectedBook(null);
      }
    } catch (err: any) {
      console.error('Failed to delete book:', err);
      setError(err.response?.data?.message || 'Failed to delete book');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookId: number, status: Book['status']) => {
    setLoading(true);
    setError(null);

    try {
      await bookAPI.updateBook(bookId, { status });
      
      // Refresh the book list
      const query = searchParams.get('q');
      const categoryId = searchParams.get('categoryId');
      const authorId = searchParams.get('authorId');
      const sortBy = searchParams.get('sortBy');
      
      if (query || categoryId || authorId || sortBy) {
        const filters: any = {};
        if (categoryId) filters.categoryId = parseInt(categoryId);
        if (authorId) filters.authorId = parseInt(authorId);
        if (sortBy) filters.sortBy = sortBy;
        await searchBooks(query || '', filters);
      } else {
        await loadUserBooks();
      }

      // Update selected book if it's currently being viewed
      if (selectedBook?.id === bookId) {
        setSelectedBook(prev => prev ? { ...prev, status } : null);
      }
    } catch (err: any) {
      console.error('Failed to update book status:', err);
      setError(err.response?.data?.message || 'Failed to update book status');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (formData: BookFormData) => {
    setLoading(true);
    setError(null);

    try {
      console.log('BooksPage handleFormSubmit formData:', formData);
      console.log('BooksPage formData keys:', Object.keys(formData));

      // Transform the form data to API format
      const apiData = {
        title: formData.title,
        isbnCode: formData.isbnCode,
        editionNumber: formData.editionNumber,
        editionDate: formData.editionDate,
        status: formData.status,
        notes: formData.notes,
        selectedAuthors: formData.selectedAuthors,
        selectedCategories: formData.selectedCategories
      };

      console.log('BooksPage apiData:', apiData);
      console.log('BooksPage apiData keys:', Object.keys(apiData));

      if (selectedBook) {
        await bookAPI.updateBook(selectedBook.id, apiData);
      } else {
        await bookAPI.createBook(apiData);
      }

      // Refresh the book list
      const query = searchParams.get('q');
      const categoryId = searchParams.get('categoryId');
      const authorId = searchParams.get('authorId');
      const sortBy = searchParams.get('sortBy');
      
      if (query || categoryId || authorId || sortBy) {
        const filters: any = {};
        if (categoryId) filters.categoryId = parseInt(categoryId);
        if (authorId) filters.authorId = parseInt(authorId);
        if (sortBy) filters.sortBy = sortBy;
        await searchBooks(query || '', filters);
      } else {
        await loadUserBooks();
      }

      setPageMode('list');
      setSelectedBook(null);
    } catch (err: any) {
      console.error('Failed to save book:', err);
      console.error('Error response data:', err.response?.data);
      const errorData = err.response?.data;
      const errorMessage = errorData?.error || errorData?.message || 'Failed to save book';
      const errorDetails = errorData?.details || [];

      // Combine error message with details for display
      const fullError = errorDetails.length > 0
        ? `${errorMessage}:\n${errorDetails.join('\n')}`
        : errorMessage;

      setError(fullError);
      throw err; // Re-throw to keep form open
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPageMode('list');
    setSelectedBook(null);
  };

  // Render different modes
  if (pageMode === 'add' || pageMode === 'edit') {
    return (
      <div style={{ maxWidth: '672px', margin: '0 auto', padding: '2rem 1rem' }}>
        <BookForm
          book={selectedBook}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600" style={{ whiteSpace: 'pre-line' }}>{error}</p>
          </div>
        )}
      </div>
    );
  }

  if (pageMode === 'details' && selectedBook) {
    return (
      <div style={{ maxWidth: '896px', margin: '0 auto', padding: '2rem 1rem' }}>
        <BookDetails
          book={selectedBook}
          onEdit={handleEditBook}
          onDelete={handleDeleteBook}
          onStatusChange={handleStatusChange}
          onClose={() => setPageMode('list')}
          loading={loading}
        />
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600" style={{ whiteSpace: 'pre-line' }}>{error}</p>
          </div>
        )}
      </div>
    );
  }

  // List mode (default)
  return (
    <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">{t('pages:books.title')}</h1>
          <p className="text-lg text-text-secondary">
            {totalCount > 0 ? t('pages:books.description_with_count', { count: totalCount }) : t('pages:books.description')}
          </p>
        </div>

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
      </div>

      {/* Search and filters */}
      <div className="mb-8">
        <BookSearchForm
          onSearch={handleSearch}
          loading={searchLoading}
          initialQuery={searchParams.get('q') || ''}
        />
      </div>

      {/* View controls */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {searchParams.get('q') && (
            <Chip
              icon={<ClearIcon />}
              label={t('pages:books.clear_search')}
              onClick={() => {
                setSearchParams({});
                clearSearch();
                loadUserBooksRef.current?.();
              }}
              onDelete={() => {
                setSearchParams({});
                clearSearch();
                loadUserBooksRef.current?.();
              }}
              color="secondary"
              variant="outlined"
              size="small"
            />
          )}
        </div>

        <Box sx={{ display: 'flex', gap: 1 }}>
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
      </div>

      {/* Screen reader announcements for list updates */}
      <div role="status" aria-live="polite" className="sr-only">
        {searchLoading
          ? t('pages:books.loading')
          : totalCount > 0
          ? `${totalCount} ${t('pages:books.books_found')}`
          : t('pages:books.no_books_empty')}
      </div>

      {/* Books list */}
      <BookList
        books={books}
        loading={searchLoading}
        error={searchError || error}
        viewMode={viewMode}
        onEdit={handleEditBook}
        onDelete={handleDeleteBook}
        onStatusChange={handleStatusChange}
        onBookClick={handleViewDetails}
        emptyMessage={searchParams.get('q') ? t('pages:books.no_books_search') : t('pages:books.no_books_empty')}
      />

      {/* Load more */}
      {hasMore && (
        <Box mt={4} textAlign="center">
          <Button
            variant="contained"
            onClick={loadMore}
            disabled={searchLoading}
            size="large"
          >
            {searchLoading ? t('pages:books.loading') : t('pages:books.load_more')}
          </Button>
        </Box>
      )}
    </div>
  );
};
export default BooksPage;