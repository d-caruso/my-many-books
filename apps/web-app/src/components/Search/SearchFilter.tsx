import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stack,
  TextField,
  IconButton,
  InputAdornment,
  Button,
  Chip,
  MenuItem,
  Paper,
  Typography
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import { SearchFilters } from '../../types';

interface SearchFilterProps {
  onSearchChange: (query: string) => void;
  onFilterChange: (filters: SearchFilters) => void;
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
  const { t } = useTranslation(['books', 'search']);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    const timeoutId = setTimeout(() => {
      onSearchChange(query);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [onSearchChange]);

  const handleFilterChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  }, [onFilterChange]);

  return (
    <Stack spacing={2} data-testid="search-filter">
      <TextField
        data-testid="search-input"
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder={t('books:search_books_placeholder')}
        label={t('books:search_books')}
        InputProps={{
          endAdornment: searchQuery ? (
            <InputAdornment position="end">
              <IconButton
                data-testid="clear-search"
                onClick={() => {
                  setSearchQuery('');
                  onSearchChange('');
                }}
                size="small"
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <Button
          data-testid="filter-toggle"
          variant="outlined"
          startIcon={<FilterListIcon />}
          onClick={() => setShowFilters(!showFilters)}
        >
          {t('search:filter.title')}
          {Object.keys(filters).length > 0 && (
            <Chip
              data-testid="filter-count"
              label={Object.keys(filters).length}
              color="primary"
              size="small"
              sx={{ ml: 1 }}
            />
          )}
        </Button>

        <TextField
          select
          label={t('search:filter.sort_books')}
          defaultValue="title-asc"
          data-testid="sort-dropdown"
          fullWidth
          onChange={(e) => {
            const [field, direction] = e.target.value.split('-');
            onSortChange({ field, direction: direction as 'asc' | 'desc' });
          }}
        >
          <MenuItem value="title-asc">{t('search:filter.sort.title_asc')}</MenuItem>
          <MenuItem value="title-desc">{t('search:filter.sort.title_desc')}</MenuItem>
          <MenuItem value="author-asc">{t('search:filter.sort.author_asc')}</MenuItem>
          <MenuItem value="author-desc">{t('search:filter.sort.author_desc')}</MenuItem>
          <MenuItem value="dateAdded-desc">{t('search:filter.sort.date_newest')}</MenuItem>
          <MenuItem value="rating-desc">{t('search:filter.sort.rating_highest')}</MenuItem>
        </TextField>
      </Stack>

      {showFilters && (
        <Paper data-testid="filter-panel" variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <TextField
              select
              label={t('search:filter.status.label')}
              defaultValue="all"
              data-testid="status-filter"
              onChange={(e) =>
                handleFilterChange({
                  ...filters,
                  status: e.target.value === 'all' ? undefined : (e.target.value as 'reading' | 'paused' | 'finished'),
                })
              }
            >
              <MenuItem value="all">{t('search:filter.status.all')}</MenuItem>
              <MenuItem value="reading">{t('search:filter.status.reading')}</MenuItem>
              <MenuItem value="paused">{t('search:filter.status.paused')}</MenuItem>
              <MenuItem value="finished">{t('search:filter.status.finished')}</MenuItem>
            </TextField>

            <TextField
              select
              label={t('search:filter.category.label')}
              defaultValue=""
              data-testid="category-filter"
              onChange={(e) =>
                handleFilterChange({
                  ...filters,
                  categoryId: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
            >
              <MenuItem value="">{t('search:filter.category.all')}</MenuItem>
              {categories.map((category, index) => (
                <MenuItem key={category} value={index + 1}>
                  {category}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label={t('search:filter.author.label')}
              defaultValue=""
              data-testid="author-filter"
              onChange={(e) =>
                handleFilterChange({
                  ...filters,
                  authorId: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
            >
              <MenuItem value="">{t('search:filter.author.all')}</MenuItem>
              {authors.map((author, index) => (
                <MenuItem key={author} value={index + 1}>
                  {author}
                </MenuItem>
              ))}
            </TextField>

            <Button
              data-testid="clear-filters"
              variant="outlined"
              color="error"
              onClick={() => {
                setFilters({});
                handleFilterChange({});
              }}
            >
              {t('search:filter.clear_all')}
            </Button>
          </Stack>
        </Paper>
      )}

      <Typography data-testid="results-count" variant="body2" color="text.secondary">
        {filteredCount !== undefined
          ? t('search:filter.results_count', { filtered: filteredCount, total: totalBooks })
          : t('search:filter.results_total', { total: totalBooks })}
      </Typography>

      {totalBooks === 0 && (
        <Typography data-testid="no-results" align="center" color="text.secondary">
          {t('search:filter.no_books')}
        </Typography>
      )}
    </Stack>
  );
};

export default SearchFilter;
