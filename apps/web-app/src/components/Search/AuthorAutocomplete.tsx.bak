import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Author } from '../../types';
import { authorAPI } from '../../services/api';

interface AuthorAutocompleteProps {
  value?: Author | null;
  onChange: (author: Author | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const AuthorAutocomplete: React.FC<AuthorAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Search by author name...",
  disabled = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Update search term when value changes externally
  useEffect(() => {
    if (value) {
      setSearchTerm(`${value.name} ${value.surname}`);
    } else {
      setSearchTerm('');
    }
  }, [value]);

  // Debounced search function
  const searchAuthors = useCallback(async (term: string) => {
    if (!term.trim() || term.length < 2) {
      setAuthors([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const results = await authorAPI.searchAuthors(term);
      setAuthors(results);
      setShowDropdown(results.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Author search failed:', error);
      setAuthors([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // If input is cleared, clear selection
    if (!newSearchTerm.trim()) {
      onChange(null);
      setAuthors([]);
      setShowDropdown(false);
      return;
    }

    // Debounce search
    debounceRef.current = setTimeout(() => {
      searchAuthors(newSearchTerm);
    }, 300);
  };

  // Handle author selection
  const handleAuthorSelect = (author: Author) => {
    onChange(author);
    setSearchTerm(`${author.name} ${author.surname}`);
    setShowDropdown(false);
    setAuthors([]);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || authors.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < authors.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : authors.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && authors[selectedIndex]) {
          handleAuthorSelect(authors[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear search on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const formatAuthorName = (author: Author) => {
    return `${author.name} ${author.surname}${author.nationality ? ` (${author.nationality})` : ''}`;
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (authors.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 pr-10 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-background text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
        />
        
        {/* Loading spinner */}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Clear button */}
        {value && !loading && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setSearchTerm('');
              setAuthors([]);
              setShowDropdown(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-text-secondary"
          >
            <span style={{fontSize: '16px'}}>✕</span>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && authors.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-surface border border-secondary-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {authors.map((author, index) => (
            <button
              key={author.id}
              type="button"
              onClick={() => handleAuthorSelect(author)}
              className={`w-full px-3 py-2 text-left hover:bg-secondary-100 focus:bg-secondary-100 focus:outline-none ${
                index === selectedIndex ? 'bg-secondary-100' : ''
              } ${index === 0 ? 'rounded-t-lg' : ''} ${index === authors.length - 1 ? 'rounded-b-lg' : ''}`}
            >
              <div className="text-text-primary font-medium">
                {author.name} {author.surname}
              </div>
              {author.nationality && (
                <div className="text-text-muted text-sm">
                  {author.nationality}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showDropdown && authors.length === 0 && searchTerm.length >= 2 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-secondary-300 rounded-lg shadow-lg p-3">
          <div className="text-text-muted text-sm text-center">
            No authors found for "{searchTerm}"
          </div>
        </div>
      )}
    </div>
  );
};