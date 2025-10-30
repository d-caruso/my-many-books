import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Search as SearchIcon,
  MenuBook as BookIcon,
  Person as PersonIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { BookSearchForm } from './BookSearchForm';
import { BookSearchResults } from './BookSearchResults';
import { useBookSearch } from '../../hooks/useBookSearch';
import { Book, SearchFilters } from '../../types';

export const BookSearchPage: React.FC = () => {
  const { t } = useTranslation(['books', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    books,
    loading,
    error,
    hasMore,
    totalCount,
    searchBooks,
    clearSearch,
    loadMore
  } = useBookSearch();

  const [initialQuery] = useState(searchParams.get('q') || '');

  // Load initial search results from URL params
  useEffect(() => {
    const query = searchParams.get('q');
    const categoryId = searchParams.get('categoryId');
    const sortBy = searchParams.get('sortBy');

    if (query || categoryId || sortBy) {
      const filters: SearchFilters = {};
      
      if (categoryId) filters.categoryId = parseInt(categoryId);
      if (sortBy) filters.sortBy = sortBy as SearchFilters['sortBy'];

      searchBooks(query || '', filters);
    }
  }, [searchParams, searchBooks]);

  const handleSearch = (query: string, filters: SearchFilters) => {
    // Update URL params
    const params = new URLSearchParams();
    
    if (query.trim()) {
      params.set('q', query);
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
    navigate(`/books/${book.id}`);
  };

  const handleClearSearch = () => {
    setSearchParams({});
    clearSearch();
  };

  return (
    <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          {t('books:search_books')}
        </h1>
        <p className="text-lg text-text-secondary">
          {t('books:find_books_description')}
        </p>
      </div>

      {/* Search form */}
      <div className="mb-8">
        <BookSearchForm
          onSearch={handleSearch}
          loading={loading}
          initialQuery={initialQuery}
        />
      </div>

      {/* Quick actions */}
      {(books.length > 0 || error) && (
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleClearSearch}
              color="inherit"
              size="small"
              startIcon={<CloseIcon />}
            >
              {t('books:clear_search')}
            </Button>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigate('/?mode=add')}
              variant="contained"
              startIcon={<AddIcon />}
            >
              {t('books:add_new_book')}
            </Button>
          </div>
        </div>
      )}

      {/* Search results */}
      <BookSearchResults
        books={books}
        loading={loading}
        error={error}
        totalCount={totalCount}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onBookSelect={handleBookSelect}
      />

      {/* Empty state for no search */}
      {!loading && books.length === 0 && !error && !searchParams.get('q') && (
        <div className="text-center py-12">
          <Box color="text.disabled" mb={3}>
            <SearchIcon sx={{ fontSize: 96, mx: 'auto', mb: 2, display: 'block' }} />
          </Box>
          <h2 className="text-2xl font-semibold text-text-primary mb-4">
            {t('books:search_your_library')}
          </h2>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            {t('books:use_search_form')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="bg-surface p-6 rounded-lg border border-secondary-200">
              <Box color="primary.main" mb={2} textAlign="center">
                <BookIcon sx={{ fontSize: 32 }} />
              </Box>
              <h3 className="font-medium text-text-primary mb-2">{t('books:search_by_title')}</h3>
              <p className="text-sm text-text-secondary">{t('books:find_by_title')}</p>
            </div>

            <div className="bg-surface p-6 rounded-lg border border-secondary-200">
              <Box color="primary.main" mb={2} textAlign="center">
                <PersonIcon sx={{ fontSize: 32 }} />
              </Box>
              <h3 className="font-medium text-text-primary mb-2">{t('books:search_by_author_heading')}</h3>
              <p className="text-sm text-text-secondary">{t('books:discover_books_by_author')}</p>
            </div>

            <div className="bg-surface p-6 rounded-lg border border-secondary-200">
              <Box color="primary.main" mb={2} textAlign="center">
                <FilterIcon sx={{ fontSize: 32 }} />
              </Box>
              <h3 className="font-medium text-text-primary mb-2">{t('books:advanced_filters_heading')}</h3>
              <p className="text-sm text-text-secondary">{t('books:filter_by_genre')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};