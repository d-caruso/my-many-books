import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  Typography
} from '@mui/material';
import type {
  AutocompleteChangeReason,
  AutocompleteCloseReason,
  AutocompleteInputChangeReason,
} from '@mui/material/Autocomplete';
import type { Author } from '@my-many-books/shared-types';
import { logger } from '../../utils/logger';
import { useApi } from '../../contexts/ApiContext';

interface AuthorAutocompleteProps {
  value?: Author | null;
  onChange: (author: Author | null) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
  reloadTrigger?: number;
  userIdFilter?: number;
}

const formatAuthorLabel = (author: Author) =>
  author.surname ? `${author.surname}, ${author.name}` : author.name;

export const AuthorAutocomplete: React.FC<AuthorAutocompleteProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  size = 'medium',
  reloadTrigger = 0,
  userIdFilter,
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
      setSearchTerm(formatAuthorLabel(value));
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
        logger.error('Author preload failed:', error);
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

  // Clear search on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const scopedAuthors = useMemo(() => {
    if (userIdFilter === undefined) {
      return authors;
    }

    const hasUserIds = authors.some((author) => author.userId !== undefined);
    if (!hasUserIds) {
      return authors;
    }

    return authors.filter((author) => author.userId === userIdFilter);
  }, [authors, userIdFilter]);

  const filteredAuthors = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return scopedAuthors;
    }

    return scopedAuthors.filter((author) => {
      const fullName = `${author.name} ${author.surname}`.toLowerCase();
      const reverseName = `${author.surname} ${author.name}`.toLowerCase();
      return fullName.includes(term) || reverseName.includes(term);
    });
  }, [scopedAuthors, searchTerm]);

  const noOptionsMessage = !searchTerm.trim()
    ? t('books:type_to_search_authors')
    : t('books:no_authors_found', { term: searchTerm });

  const handleSelectionChange = (
    _event: React.SyntheticEvent,
    newValue: Author | null,
    reason: AutocompleteChangeReason
  ) => {
    onChange(newValue);

    if (reason === 'selectOption') {
      setShowDropdown(false);
    }
  };

  const handleInputChange = (
    _event: React.SyntheticEvent,
    newInputValue: string,
    reason: AutocompleteInputChangeReason
  ) => {
    if (reason === 'blur') {
      setShowDropdown(false);
      return;
    }

    if (reason === 'clear') {
      setSearchTerm('');
      setShowDropdown(true);
      return;
    }

    if (reason === 'reset' || reason === 'selectOption') {
      setSearchTerm(newInputValue);
      setShowDropdown(false);
      return;
    }

    setSearchTerm(newInputValue);
    setShowDropdown(true);
  };

  const handleClose = (_event: React.SyntheticEvent, _reason: AutocompleteCloseReason) => {
    setShowDropdown(false);
  };

  return (
    <Box data-testid="autocomplete">
      <Autocomplete
        value={value}
        onChange={handleSelectionChange}
        inputValue={searchTerm}
        onInputChange={handleInputChange}
        options={filteredAuthors}
        getOptionLabel={formatAuthorLabel}
        ListboxProps={{ 'data-testid': 'options-list' }}
        renderOption={(props, option, { index }) => {
          const { key, ...otherProps } = props;
          return (
            <Box component="li" key={key} data-testid={`option-${index}`} {...otherProps}>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {formatAuthorLabel(option)}
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
        onClose={handleClose}
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
