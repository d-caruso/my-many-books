import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  Paper,
  Snackbar,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import BookIcon from '@mui/icons-material/MenuBook';
import PersonIcon from '@mui/icons-material/Person';
import FilterIcon from '@mui/icons-material/FilterList';
import { BookSearchForm } from './BookSearchForm';
import { BookSearchResults } from './BookSearchResults';
import { useBookSearch } from '../../hooks/useBookSearch';
import type { Book, SearchFilters } from '@my-many-books/shared-types';
import { ADD_BOOK_SCANNER_DRAFT_STORAGE_KEY } from '../../constants/scanner';
import { useProtectedViewTransition } from '../../contexts/ViewTransitionContext';

const BookSearchPage: React.FC = () => {
  const { t } = useTranslation(['books', 'common', 'scanner']);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { runMainContentTransition } = useProtectedViewTransition();
  const {
    books,
    loading,
    error,
    hasMore,
    totalCount,
    searchBooks,
    searchByISBN,
    clearSearch,
    loadMore
  } = useBookSearch();

  const [initialQuery] = useState(searchParams.get('q') || '');
  const [isbnBook, setIsbnBook] = useState<Book | null>(null);
  const [scannerNoticeOpen, setScannerNoticeOpen] = useState(false);
  const [scannerNoticeMessage, setScannerNoticeMessage] = useState('');

  const isbnParam = searchParams.get('isbn');
  const scannerSource = searchParams.get('scannerSource');
  const scannerCopy = searchParams.get('scannerCopy');

  // Load initial search results from URL params
  useEffect(() => {
    if (isbnParam) {
      searchByISBN(isbnParam).then(result => {
        setIsbnBook(result);

        if (!result && scannerSource === 'scanner') {
          const addParams = new URLSearchParams({
            mode: 'add',
            isbn: isbnParam,
          });

          if (scannerCopy === 'success' || scannerCopy === 'failed') {
            addParams.set('scannerSource', 'scanner');
            addParams.set('scannerCopy', scannerCopy);
          }

          runMainContentTransition(() => {
            navigate(`/?${addParams.toString()}`, { replace: true });
          });
          return;
        }

        if (result && scannerSource === 'scanner') {
          try {
            window.sessionStorage.removeItem(ADD_BOOK_SCANNER_DRAFT_STORAGE_KEY);
          } catch {
            // Non-blocking cleanup; search UX should proceed.
          }

          setScannerNoticeMessage(
            scannerCopy === 'success'
              ? t('isbn_copied', { ns: 'scanner', defaultValue: 'ISBN copied' })
              : t('isbn_detected', { ns: 'scanner', defaultValue: 'ISBN detected' })
          );
          setScannerNoticeOpen(true);

          const newParams = new URLSearchParams(searchParams);
          newParams.delete('scannerSource');
          newParams.delete('scannerCopy');
          setSearchParams(newParams, { replace: true });
        }
      });
      return;
    }

    const query = searchParams.get('q');
    const categoryId = searchParams.get('categoryId');
    const authorId = searchParams.get('authorId');
    const sortBy = searchParams.get('sortBy');
    const status = searchParams.get('status');

    if (query || categoryId || authorId || sortBy || status) {
      const filters: SearchFilters = {};

      if (categoryId) filters.categoryId = parseInt(categoryId);
      if (authorId) filters.authorId = parseInt(authorId);
      if (sortBy) filters.sortBy = sortBy as SearchFilters['sortBy'];
      if (status) filters.status = status as SearchFilters['status'];

      searchBooks(query || '', filters);
    }
  }, [searchParams, searchBooks, isbnParam, searchByISBN, scannerSource, scannerCopy, navigate, setSearchParams, t]);

  const handleSearch = (query: string, filters: SearchFilters) => {
    // Update URL params
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set('q', query.trim());
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, value.toString());
      }
    });

    setSearchParams(params);
    
    // Perform search
    searchBooks(query, filters);
  };

  const handleBookSelect = (book: Book) => {
    // Navigate to book details page
    runMainContentTransition(() => {
      navigate(`/books/${book.id}`);
    });
  };

  const handleClearSearch = () => {
    setSearchParams({});
    clearSearch();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          {t('books:search_books')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('books:find_books_description')}
        </Typography>
      </Box>

      <Box mb={4}>
        <BookSearchForm
          onSearch={handleSearch}
          loading={loading}
          initialQuery={initialQuery}
        />
      </Box>

      {(books.length > 0 || error) && (
        <Box
          mb={4}
          display="flex"
          flexWrap="wrap"
          justifyContent="space-between"
          alignItems="center"
          gap={2}
        >
          <Button
            onClick={handleClearSearch}
            color="inherit"
            size="small"
            startIcon={<CloseIcon />}
          >
            {t('books:clear_search')}
          </Button>
          <Button
            onClick={() => {
              runMainContentTransition(() => {
                navigate('/?mode=add');
              });
            }}
            variant="contained"
            startIcon={<AddIcon />}
          >
            {t('books:add_new_book')}
          </Button>
        </Box>
      )}

      {/* Search results */}
      <BookSearchResults
        books={isbnParam ? (isbnBook ? [isbnBook] : []) : books}
        loading={loading}
        error={error}
        totalCount={isbnParam ? (isbnBook ? 1 : 0) : totalCount}
        hasMore={isbnParam ? false : hasMore}
        onLoadMore={loadMore}
        onBookSelect={handleBookSelect}
        scannedIsbn={isbnParam || undefined}
      />

      {/* Empty state for no search */}
      {!loading && books.length === 0 && !error && !searchParams.get('q') && !isbnParam && (
        <Box textAlign="center" py={6}>
          <Box color="text.disabled" mb={2}>
            <SearchIcon sx={{ fontSize: 96 }} />
          </Box>
          <Typography variant="h5" gutterBottom>
            {t('books:search_your_library')}
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={4}>
            {t('books:use_search_form')}
          </Typography>

          <Grid container spacing={3} maxWidth="md" mx="auto">
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                <Box color="primary.main" mb={2} textAlign="center">
                  <BookIcon sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="subtitle1" gutterBottom>
                  {t('books:search_by_title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('books:find_by_title')}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                <Box color="primary.main" mb={2} textAlign="center">
                  <PersonIcon sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="subtitle1" gutterBottom>
                  {t('books:search_by_author_heading')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('books:discover_books_by_author')}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                <Box color="primary.main" mb={2} textAlign="center">
                  <FilterIcon sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="subtitle1" gutterBottom>
                  {t('books:advanced_filters_heading')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('books:filter_by_genre')}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      <Snackbar
        open={scannerNoticeOpen}
        autoHideDuration={3000}
        onClose={() => setScannerNoticeOpen(false)}
      >
        <Alert onClose={() => setScannerNoticeOpen(false)} severity="success">
          {scannerNoticeMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default BookSearchPage;
