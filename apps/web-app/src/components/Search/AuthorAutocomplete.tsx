import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  Typography
} from '@mui/material';
import type { Author } from '@my-many-books/shared-types';
import { useApi } from '../../contexts/ApiContext';

interface AuthorAutocompleteProps {
  value?: Author | null;
  onChange: (author: Author | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
  reloadTrigger?: number;
}

export const AuthorAutocomplete: React.FC<AuthorAutocompleteProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  size = 'medium',
  reloadTrigger = 0,
}) => {
  const { t } = useTranslation(['books', 'common']);
  const { authorAPI } = useApi();
  const [searchTerm, setSearchTerm] = useState('');
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const mountedRef = useRef(true);

  // Update search term when value changes externally
  useEffect(() => {
    if (value) {
      setSearchTerm(`${value.name} ${value.surname}`);
    } else {
      setSearchTerm('');
    }
  }, [value]);

  useEffect(() => {
    mountedRef.current = true;

    const preloadAuthors = async () => {
      setLoading(true);
      try {
        const results = await authorAPI.getAuthors();
        const sorted = [...results].sort((a, b) =>
          `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`)
        );
        if (mountedRef.current) {
          setAuthors(sorted);
        }
      } catch (error) {
        console.error('Author preload failed:', error);
        if (mountedRef.current) {
          setAuthors([]);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    void preloadAuthors();

    return () => {
      mountedRef.current = false;
    };
  }, [authorAPI, reloadTrigger]);

  /*
   * Previous debounced server-side search (kept for the planned hybrid Phase 2 implementation).
   * Phase 1 preloads authors once and filters locally for better UX on small/medium datasets.
   *
   * const searchAuthors = useCallback(async (term: string) => {
   *   if (!term.trim() || term.length < 2) {
   *     setAuthors([]);
   *     setShowDropdown(false);
   *     return;
   *   }
   *
   *   setLoading(true);
   *   try {
   *     const results = await authorAPI.searchAuthors(term);
   *     setAuthors(results);
   *     setShowDropdown(results.length > 0);
   *   } catch (error) {
   *     console.error('Author search failed:', error);
   *     setAuthors([]);
   *     setShowDropdown(false);
   *   } finally {
   *     setLoading(false);
   *   }
   * }, [authorAPI]);
   */

  // Clear search on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const filteredAuthors = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return authors;
    }

    return authors.filter((author) => {
      const fullName = `${author.name} ${author.surname}`.toLowerCase();
      const reverseName = `${author.surname} ${author.name}`.toLowerCase();
      return fullName.includes(term) || reverseName.includes(term);
    });
  }, [authors, searchTerm]);

  const noOptionsMessage = !searchTerm.trim()
    ? t('books:type_to_search_authors')
    : t('books:no_authors_found', { term: searchTerm });

  return (
    <Box data-testid="autocomplete">
      <Autocomplete
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        inputValue={searchTerm}
        onInputChange={(_, newInputValue) => {
        setSearchTerm(newInputValue);

        // If input is cleared, clear selection
        if (!newInputValue.trim()) {
          setShowDropdown(true);
          return;
        }
        setShowDropdown(true);

        /*
         * Phase 2 (hybrid) will restore debounced server-side search here when the
         * author dataset exceeds the preload threshold.
         */
      }}
        options={filteredAuthors}
        getOptionLabel={(option) => `${option.name} ${option.surname}`}
        ListboxProps={{ 'data-testid': 'options-list' }}
        renderOption={(props, option, { index }) => {
          const { key, ...otherProps } = props;
          return (
            <Box component="li" key={key} data-testid={`option-${index}`} {...otherProps}>
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
          <Box data-testid="text-field">
            <TextField
              {...params}
              label={t('books:author')}
              placeholder={placeholder || t('books:search_by_author_placeholder')}
              disabled={disabled}
              size={size}
              inputProps={{
                ...params.inputProps,
                'data-testid': 'autocomplete-input'
              }}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <Box data-testid="input-adornment">
                    {loading ? (
                      <CircularProgress color="inherit" size={16} data-testid="circular-progress" />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </Box>
                ),
              }}
            />
          </Box>
        )}
        loading={loading}
        noOptionsText={noOptionsMessage}
        open={showDropdown}
        onOpen={() => setShowDropdown(true)}
        onClose={() => setShowDropdown(false)}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        filterOptions={(x) => x} // We already apply local filtering to the preloaded author list
      />
      <Box data-testid="open-state" sx={{ display: 'none' }}>
        {showDropdown ? 'open' : 'closed'}
      </Box>
      <Box data-testid="loading-state" sx={{ display: 'none' }}>
        {loading ? 'loading' : 'not-loading'}
      </Box>
      <Typography data-testid="no-options-text" sx={{ display: 'none' }}>
        {noOptionsMessage}
      </Typography>
    </Box>
  );
};
