import React, { useState, useEffect } from 'react';
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
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Clear as ClearIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { SearchFilters, Author } from '../../types';
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
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { categories, loading: categoriesLoading } = useCategories();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: require either min 2 chars in query OR at least one filter
    const hasValidQuery = query.trim().length >= 2;
    const hasFilters = Object.values(filters).some(value => value !== undefined && value !== '' && value !== null);
    
    if (!hasValidQuery && !hasFilters) {
      setValidationError(t('form.validation_error'));
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
    <Paper sx={{ p: 3 }}>
      <Box component="form" onSubmit={handleSubmit}>
        {/* Main search input */}
        <Box display="flex" gap={2} mb={2}>
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
            sx={{ minWidth: 120 }}
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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
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
                    disabled={categoriesLoading}
                    label={t('form.category_label')}
                  >
                    <MenuItem value="">
                      {categoriesLoading ? t('form.category_loading') : t('form.category_all')}
                    </MenuItem>
                    {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
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

              {/* Second row - Sort By */}
              <Box sx={{ maxWidth: { xs: '100%', sm: '300px' } }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="sortBy-label">{t('form.sort_label')}</InputLabel>
                  <Select
                    labelId="sortBy-label"
                    id="sortBy"
                    value={filters.sortBy || 'title'}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    label={t('form.sort_label')}
                  >
                    <MenuItem value="title">{t('form.sort_title')}</MenuItem>
                    <MenuItem value="author">{t('form.sort_author')}</MenuItem>
                    <MenuItem value="date-added">{t('form.sort_date')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Stack>
          </Box>
        </Collapse>
      </Box>
    </Paper>
  );
};