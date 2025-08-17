import React, { useState, useCallback, useEffect } from 'react';

interface SearchFilterProps {
  onSearchChange: (query: string) => void;
  onFilterChange: (filters: any) => void;
  onSortChange: (sort: { field: string; direction: 'asc' | 'desc' }) => void;
  categories: string[];
  authors: string[];
  totalBooks: number;
  filteredCount?: number;
}

const SearchFilter: React.FC<SearchFilterProps> = ({
  onSearchChange,
  onFilterChange,
  onSortChange,
  categories,
  authors,
  totalBooks,
  filteredCount
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<any>({});
  
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    // Debounce search
    const timeoutId = setTimeout(() => {
      onSearchChange(query);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [onSearchChange]);

  const handleFilterChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  }, [onFilterChange]);

  return (
    <div data-testid="search-filter" className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <input
          data-testid="search-input"
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search books..."
          aria-label="Search books"
          className="w-full px-4 py-2 border rounded-lg"
        />
        {searchQuery && (
          <button
            data-testid="clear-search"
            onClick={() => {
              setSearchQuery('');
              onSearchChange('');
            }}
            className="absolute right-2 top-2"
          >
            ×
          </button>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex justify-between items-center">
        <button
          data-testid="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
          aria-label="Toggle filters"
          className="px-4 py-2 border rounded"
        >
          Filters
          {Object.keys(filters).length > 0 && (
            <span data-testid="filter-count" className="ml-2 bg-blue-500 text-white rounded-full px-2 py-1 text-xs">
              {Object.keys(filters).length}
            </span>
          )}
        </button>

        {/* Sort Dropdown */}
        <select
          data-testid="sort-dropdown"
          onChange={(e) => {
            const [field, direction] = e.target.value.split('-');
            onSortChange({ field, direction: direction as 'asc' | 'desc' });
          }}
          aria-label="Sort books"
          className="px-4 py-2 border rounded"
        >
          <option value="title-asc">Title A-Z</option>
          <option value="title-desc">Title Z-A</option>
          <option value="author-asc">Author A-Z</option>
          <option value="author-desc">Author Z-A</option>
          <option value="dateAdded-desc">Date Added (Newest)</option>
          <option value="rating-desc">Rating (Highest)</option>
        </select>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div data-testid="filter-panel" className="border rounded-lg p-4 space-y-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              data-testid="status-filter"
              onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="all">All Books</option>
              <option value="reading">Currently Reading</option>
              <option value="read">Read</option>
              <option value="want-to-read">Want to Read</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Categories</label>
            <div data-testid="category-filter" className="space-y-2">
              {categories.map((category) => (
                <label key={category} className="flex items-center">
                  <input
                    data-testid="category-option"
                    type="checkbox"
                    value={category}
                    onChange={(e) => {
                      const selectedCategories = filters.categories || [];
                      if (e.target.checked) {
                        handleFilterChange({ 
                          ...filters, 
                          categories: [...selectedCategories, category] 
                        });
                      } else {
                        handleFilterChange({
                          ...filters,
                          categories: selectedCategories.filter((c: string) => c !== category)
                        });
                      }
                    }}
                    className="mr-2"
                  />
                  {category}
                </label>
              ))}
            </div>
          </div>

          {/* Author Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Author</label>
            <select
              data-testid="author-filter"
              onChange={(e) => handleFilterChange({ ...filters, author: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">All Authors</option>
              {authors.map((author) => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Rating</label>
            <select
              data-testid="min-rating"
              onChange={(e) => handleFilterChange({ ...filters, minRating: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Any Rating</option>
              <option value="1">1+ Stars</option>
              <option value="2">2+ Stars</option>
              <option value="3">3+ Stars</option>
              <option value="4">4+ Stars</option>
              <option value="5">5 Stars</option>
            </select>
          </div>

          {/* Clear Filters */}
          <button
            data-testid="clear-filters"
            onClick={() => {
              setFilters({});
              handleFilterChange({});
            }}
            className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Results Count */}
      <div data-testid="results-count" className="text-sm text-gray-600">
        {filteredCount !== undefined 
          ? `${filteredCount} of ${totalBooks} books`
          : `${totalBooks} books`
        }
      </div>

      {totalBooks === 0 && (
        <div data-testid="no-results" className="text-center py-8 text-gray-500">
          No books found
        </div>
      )}
    </div>
  );
};

export default SearchFilter;