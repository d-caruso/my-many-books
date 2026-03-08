import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Paper,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  InputAdornment,
  Alert,
  Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ClearIcon from '@mui/icons-material/Clear';
import WarningIcon from '@mui/icons-material/Warning';
import { SearchFiltersSchema, SEARCH_QUERY_MIN_LENGTH } from '@my-many-books/shared-types';
import type { SearchFilters, Author } from '@my-many-books/shared-types';
import { createCategoryDisplayNameComparator, getCategoryDisplayName } from '@my-many-books/shared-utils';
import { useCategories } from '../../hooks/useCategories';
import { AuthorAutocomplete } from './AuthorAutocomplete';

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
  const { t } = useTranslation('search');
  const { t: tCategories, i18n } = useTranslation('categories');
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const categorySortComparator = useMemo(
    () => createCategoryDisplayNameComparator(tCategories, i18n.language),
    [tCategories, i18n.language]
  );
  const { categories, loading: categoriesLoading, sorting: categoriesSorting } = useCategories({
    sortComparator: categorySortComparator,
  });

  useEffect(() => {
    setQuery(initialQuery);
    setValidationError(null);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: require either valid query (from shared schema) OR at least one filter
    const parsedQuery = SearchFiltersSchema.shape.query.safeParse(query.trim());
    const hasValidQuery = parsedQuery.success && !!parsedQuery.data;
    const hasFilters = Object.values(filters).some(value => value !== undefined && value !== '' && value !== null);

    if (!hasValidQuery && !hasFilters) {
      setValidationError(t('form.validation_error', { min: SEARCH_QUERY_MIN_LENGTH }));
      return;
    }

    setValidationError(null);
    onSearch(query, filters);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    // Clear validation error when filter changes
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleAuthorChange = (author: Author | null) => {
    setSelectedAuthor(author);
    handleFilterChange('authorId', author?.id);
  };

  const clearFilters = () => {
    setFilters({});
    setQuery('');
    setSelectedAuthor(null);
    setValidationError(null);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Box component="form" onSubmit={handleSubmit}>
        {/* Main search input */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: 2
          }}
        >
          <TextField
            fullWidth
            id="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t('form.placeholder')}
            disabled={loading}
            error={!!validationError}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{
              display: { xs: 'none', sm: 'flex' },
              minWidth: 120,
              width: 'auto'
            }}
          >
            {loading ? t('form.searching') : t('form.search_button')}
          </Button>
        </Box>

        {/* Validation Error */}
        {validationError && (
          <Box mb={2}>
            <Alert severity="warning" icon={<WarningIcon />}>
              {validationError}
            </Alert>
          </Box>
        )}

        {/* Advanced filters toggle */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexWrap: 'wrap',
            gap: 1,
            mb: 1
          }}
        >
          <Button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            color="primary"
            size="small"
            endIcon={
              <ExpandMoreIcon
                sx={{
                  transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
            }
          >
            {t('form.advanced_filters')}
          </Button>

          {(Object.keys(filters).length > 0 || query || selectedAuthor) && (
            <Button
              type="button"
              onClick={clearFilters}
              size="small"
              color="inherit"
              startIcon={<ClearIcon />}
            >
              {t('form.clear_all')}
            </Button>
          )}
        </Box>

        {/* Advanced filters */}
        <Collapse in={showAdvanced}>
          <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack spacing={2}>
              {/* First row - Author, Category, Status */}
              <Box 
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)'
                  },
                  gap: 2
                }}
              >
                {/* Author search */}
                <AuthorAutocomplete
                  value={selectedAuthor}
                  onChange={handleAuthorChange}
                  placeholder={t('form.author_placeholder')}
                  disabled={loading}
                  size="small"
                />

                {/* Category filter */}
                <FormControl fullWidth size="small">
                  <InputLabel id="category-label">{t('form.category_label')}</InputLabel>
                  <Select
                    labelId="category-label"
                    id="categoryId"
                    value={filters.categoryId || ''}
                    onChange={(e) => handleFilterChange('categoryId', e.target.value ? parseInt(e.target.value as unknown as string) : undefined)}
                    disabled={categoriesLoading || categoriesSorting}
                    label={t('form.category_label')}
                  >
                    <MenuItem value="">
                      {categoriesLoading || categoriesSorting ? t('form.category_loading') : t('form.category_all')}
                    </MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {getCategoryDisplayName(category, tCategories)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Book status */}
                <FormControl fullWidth size="small">
                  <InputLabel id="status-label">{t('form.status_label')}</InputLabel>
                  <Select
                    labelId="status-label"
                    id="status"
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    label={t('form.status_label')}
                  >
                    <MenuItem value="">{t('form.status_any')}</MenuItem>
                    <MenuItem value="reading">{t('form.status_reading')}</MenuItem>
                    <MenuItem value="paused">{t('form.status_paused')}</MenuItem>
                    <MenuItem value="finished">{t('form.status_finished')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Second row - Sort By and Sort Order */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)'
                  },
                  gap: 2,
                  maxWidth: { xs: '100%', md: '600px' }
                }}
              >
                <FormControl fullWidth size="small">
                  <InputLabel id="sortBy-label">{t('sorting.label')}</InputLabel>
                  <Select
                    labelId="sortBy-label"
                    id="sortBy"
                    value={filters.sortBy || 'title'}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    label={t('sorting.label')}
                  >
                    <MenuItem value="title">{t('sorting.fields.title')}</MenuItem>
                    <MenuItem value="relevance">{t('sorting.fields.relevance')}</MenuItem>
                    <MenuItem value="createdAt">{t('sorting.fields.createdAt')}</MenuItem>
                    <MenuItem value="updatedAt">{t('sorting.fields.updatedAt')}</MenuItem>
                    <MenuItem value="status">{t('sorting.fields.status')}</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel id="sortOrder-label">{t('sorting.direction_label')}</InputLabel>
                  <Select
                    labelId="sortOrder-label"
                    id="sortOrder"
                    value={filters.sortOrder || 'asc'}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    label={t('sorting.direction_label')}
                    disabled={filters.sortBy === 'relevance'}
                  >
                    <MenuItem value="asc">{t('sorting.directions.asc')}</MenuItem>
                    <MenuItem value="desc">{t('sorting.directions.desc')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Stack>
          </Box>
        </Collapse>

        {/* Search button — mobile only, after filters */}
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          sx={{ display: { xs: 'flex', sm: 'none' }, width: '100%', mt: 2 }}
        >
          {loading ? t('form.searching') : t('form.search_button')}
        </Button>
      </Box>
    </Paper>
  );
};
