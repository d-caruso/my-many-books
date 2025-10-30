import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  Typography
} from '@mui/material';
import { Author } from '../../types';
import { useApi } from '../../contexts/ApiContext';

interface AuthorAutocompleteProps {
  value?: Author | null;
  onChange: (author: Author | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

export const AuthorAutocomplete: React.FC<AuthorAutocompleteProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  size = 'medium'
}) => {
  const { t } = useTranslation(['books', 'common']);
  const { authorAPI } = useApi();
  const [searchTerm, setSearchTerm] = useState('');
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

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
  }, [authorAPI]);





  // Clear search on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);


  return (
    <Autocomplete
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={searchTerm}
      onInputChange={(_, newInputValue) => {
        setSearchTerm(newInputValue);
        
        // Clear previous timeout
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        // If input is cleared, clear selection
        if (!newInputValue.trim()) {
          setAuthors([]);
          setShowDropdown(false);
          return;
        }

        // Debounce search
        debounceRef.current = setTimeout(() => {
          searchAuthors(newInputValue);
        }, 300);
      }}
      options={authors}
      getOptionLabel={(option) => `${option.name} ${option.surname}`}
      renderOption={(props, option) => {
        const { key, ...otherProps } = props;
        return (
          <Box component="li" key={key} {...otherProps}>
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {option.name} {option.surname}
              </Typography>
              {option.nationality && (
                <Typography variant="caption" color="text.secondary">
                  {option.nationality}
                </Typography>
              )}
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={t('books:author')}
          placeholder={placeholder || t('books:search_by_author_placeholder')}
          disabled={disabled}
          size={size}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      loading={loading}
      noOptionsText={searchTerm.length < 2 ? t('books:type_to_search_authors') : t('books:no_authors_found', { term: searchTerm })}
      open={showDropdown}
      onOpen={() => setShowDropdown(true)}
      onClose={() => setShowDropdown(false)}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      filterOptions={(x) => x} // Disable client-side filtering since we do server-side search
    />
  );
};