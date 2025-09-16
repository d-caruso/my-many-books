import React, { useState, useEffect } from 'react';
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
      setValidationError('Please enter at least 2 characters in the search box or select an advanced filter.');
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
            placeholder="Search by title, author, ISBN..."
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
            {loading ? 'Searching...' : 'Search'}
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
            Advanced Filters
          </Button>

          {(Object.keys(filters).length > 0 || query || selectedAuthor) && (
            <Button
              type="button"
              onClick={clearFilters}
              size="small"
              color="inherit"
              startIcon={<ClearIcon />}
            >
              Clear all
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
                  placeholder="Search by author name..."
                  disabled={loading}
                  size="small"
                />

                {/* Category filter */}
                <FormControl fullWidth size="small">
                  <InputLabel id="category-label">Category</InputLabel>
                  <Select
                    labelId="category-label"
                    id="categoryId"
                    value={filters.categoryId || ''}
                    onChange={(e) => handleFilterChange('categoryId', e.target.value ? parseInt(e.target.value as unknown as string) : undefined)}
                    disabled={categoriesLoading}
                    label="Category"
                  >
                    <MenuItem value="">
                      {categoriesLoading ? 'Loading categories...' : 'All Categories'}
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
                  <InputLabel id="status-label">Reading Status</InputLabel>
                  <Select
                    labelId="status-label"
                    id="status"
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    label="Reading Status"
                  >
                    <MenuItem value="">Any Status</MenuItem>
                    <MenuItem value="in progress">In Progress</MenuItem>
                    <MenuItem value="paused">Paused</MenuItem>
                    <MenuItem value="finished">Finished</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Second row - Sort By */}
              <Box sx={{ maxWidth: { xs: '100%', sm: '300px' } }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="sortBy-label">Sort By</InputLabel>
                  <Select
                    labelId="sortBy-label"
                    id="sortBy"
                    value={filters.sortBy || 'title'}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    label="Sort By"
                  >
                    <MenuItem value="title">Title (A-Z)</MenuItem>
                    <MenuItem value="author">Author (A-Z)</MenuItem>
                    <MenuItem value="date-added">Recently Added</MenuItem>
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