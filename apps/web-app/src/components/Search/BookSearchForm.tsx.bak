import React, { useState, useEffect } from 'react';
import { SearchFilters, Author } from '../../types';
import { useCategories } from '../../hooks/useCategories';
import { AuthorAutocomplete } from './AuthorAutocomplete';
import { ResponsiveInput } from '../UI/ResponsiveInput';
import { ResponsiveSelect } from '../UI/ResponsiveSelect';
import { ResponsiveButton } from '../UI/ResponsiveButton';

interface BookSearchFormProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  loading?: boolean;
  initialQuery?: string;
}

export const BookSearchForm: React.FC<BookSearchFormProps> = ({
  onSearch,
  loading = false,
  initialQuery = ''
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategories();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, filters);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const handleAuthorChange = (author: Author | null) => {
    setSelectedAuthor(author);
    handleFilterChange('authorId', author?.id);
  };

  const clearFilters = () => {
    setFilters({});
    setQuery('');
    setSelectedAuthor(null);
  };

  return (
    <div className="bg-surface rounded-lg shadow-sm border border-secondary-200 p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main search input */}
        <div className="flex space-x-2">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">
              Search books
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-text-muted" style={{fontSize: '20px'}}>🔍</span>
              </div>
              <input
                type="text"
                id="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, author, ISBN..."
                className="block w-full pl-10 pr-3 py-3 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-background text-text-primary text-base sm:text-sm min-h-[44px] touch-manipulation transition-colors duration-200 hover:border-secondary-400"
                disabled={loading}
              />
            </div>
          </div>
          
          <ResponsiveButton
            type="submit"
            variant="primary"
            size="md"
            disabled={loading}
            loading={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </ResponsiveButton>
        </div>

        {/* Advanced filters toggle */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center space-x-1"
          >
            <span>Advanced Filters</span>
            <span 
              className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              style={{fontSize: '16px', display: 'inline-block'}}
            >
              ▼
            </span>
          </button>

          {(Object.keys(filters).length > 0 || query || selectedAuthor) && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-text-muted hover:text-text-secondary text-sm"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-secondary-200">
            {/* Author search */}
            <div>
              <label htmlFor="author" className="block text-sm font-medium text-text-secondary mb-1">
                Author
              </label>
              <AuthorAutocomplete
                value={selectedAuthor}
                onChange={handleAuthorChange}
                placeholder="Search by author name..."
                disabled={loading}
              />
            </div>

            {/* Category filter */}
            <ResponsiveSelect
              id="categoryId"
              label="Category"
              value={filters.categoryId || ''}
              onChange={(e) => handleFilterChange('categoryId', e.target.value ? parseInt(e.target.value) : undefined)}
              disabled={categoriesLoading}
              error={categoriesError || undefined}
            >
              <option value="">
                {categoriesLoading ? 'Loading categories...' : 'All Categories'}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </ResponsiveSelect>

            {/* Book status */}
            <ResponsiveSelect
              id="status"
              label="Reading Status"
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Any Status</option>
              <option value="in progress">In Progress</option>
              <option value="paused">Paused</option>
              <option value="finished">Finished</option>
            </ResponsiveSelect>

            {/* Sort by */}
            <ResponsiveSelect
              id="sortBy"
              label="Sort By"
              value={filters.sortBy || 'relevance'}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            >
              <option value="relevance">Relevance</option>
              <option value="title">Title (A-Z)</option>
              <option value="author">Author (A-Z)</option>
              <option value="date-added">Recently Added</option>
            </ResponsiveSelect>
          </div>
        )}
      </form>
    </div>
  );
};