import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BookSearchForm } from './BookSearchForm';
import { BookSearchResults } from './BookSearchResults';
import { useBookSearch } from '../../hooks/useBookSearch';
import { Book, SearchFilters } from '../../types';

export const BookSearchPage: React.FC = () => {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Search Books
        </h1>
        <p className="text-lg text-text-secondary">
          Find books in your library or discover new ones to add
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
            <button
              onClick={handleClearSearch}
              className="text-text-muted hover:text-text-secondary text-sm flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Clear search</span>
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/books/add')}
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add New Book</span>
            </button>
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
          <div className="text-text-muted mb-6">
            <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-text-primary mb-4">
            Search Your Library
          </h2>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            Use the search form above to find books in your collection, or discover new books to add to your library.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="bg-surface p-6 rounded-lg border border-secondary-200">
              <div className="text-primary-500 mb-3">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-medium text-text-primary mb-2">Search by Title</h3>
              <p className="text-sm text-text-secondary">Find books by their title or keywords</p>
            </div>

            <div className="bg-surface p-6 rounded-lg border border-secondary-200">
              <div className="text-primary-500 mb-3">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="font-medium text-text-primary mb-2">Search by Author</h3>
              <p className="text-sm text-text-secondary">Discover all books by your favorite authors</p>
            </div>

            <div className="bg-surface p-6 rounded-lg border border-secondary-200">
              <div className="text-primary-500 mb-3">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
              </div>
              <h3 className="font-medium text-text-primary mb-2">Advanced Filters</h3>
              <p className="text-sm text-text-secondary">Filter by genre, year, status, and more</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};