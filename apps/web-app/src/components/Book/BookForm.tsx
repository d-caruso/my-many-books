import React, { useState, useEffect } from 'react';
import {
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Stack,
  Divider,
  IconButton
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { Book, Author, Category } from '../../types';
import { useCategories } from '../../hooks/useCategories';
import { AuthorAutocomplete } from '../Search/AuthorAutocomplete';
import { AddAuthorDialog } from '../Author/AddAuthorDialog';
import { AddCategoryDialog } from '../Category/AddCategoryDialog';

interface BookFormProps {
  book?: Book | null;
  onSubmit: (bookData: BookFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
}

export interface BookFormData {
  title: string;
  isbnCode: string;
  editionNumber?: number;
  editionDate?: string;
  status?: Book['status'];
  notes?: string;
  selectedAuthors: Author[];
  selectedCategories: number[];
}

export const BookForm: React.FC<BookFormProps> = ({
  book,
  onSubmit,
  onCancel,
  loading = false,
  title = book ? 'Edit Book' : 'Add New Book'
}) => {
  const { categories, loading: categoriesLoading, loadCategories } = useCategories();
  const [formData, setFormData] = useState<BookFormData>({
    title: '',
    isbnCode: '',
    editionNumber: undefined,
    editionDate: '',
    status: undefined,
    notes: '',
    selectedAuthors: [],
    selectedCategories: []
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BookFormData, string>>>({});
  const [addAuthorDialogOpen, setAddAuthorDialogOpen] = useState(false);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);

  // Initialize form with book data
  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title,
        isbnCode: book.isbnCode,
        editionNumber: book.editionNumber,
        editionDate: book.editionDate ? book.editionDate.split('T')[0] : '',
        status: book.status,
        notes: book.notes || '',
        selectedAuthors: book.authors || [],
        selectedCategories: book.categories?.map((cat: Category) => cat.id) || []
      });
    }
  }, [book]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof BookFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.isbnCode.trim()) {
      newErrors.isbnCode = 'ISBN is required';
    } else if (!/^[\d\-X]{10,17}$/.test(formData.isbnCode.replace(/\s/g, ''))) {
      newErrors.isbnCode = 'Invalid ISBN format';
    }

    if (formData.editionNumber !== undefined && formData.editionNumber < 1) {
      newErrors.editionNumber = 'Edition number must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error: any) {
      console.error('Form submission error:', error);
      console.error('Error response:', error?.response?.data);
    }
  };

  const handleInputChange = (field: keyof BookFormData, value: string | number | Author[] | number[] | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAuthorAdd = (author: Author | null) => {
    if (author && !formData.selectedAuthors.find(a => a.id === author.id)) {
      handleInputChange('selectedAuthors', [...formData.selectedAuthors, author]);
    }
  };

  const handleAuthorRemove = (authorId: number) => {
    handleInputChange('selectedAuthors', 
      formData.selectedAuthors.filter(a => a.id !== authorId)
    );
  };

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    if (checked) {
      handleInputChange('selectedCategories', [...formData.selectedCategories, categoryId]);
    } else {
      handleInputChange('selectedCategories',
        formData.selectedCategories.filter(id => id !== categoryId)
      );
    }
  };

  const handleAuthorCreated = (author: Author) => {
    // Add the newly created author to the selected authors list
    handleInputChange('selectedAuthors', [...formData.selectedAuthors, author]);
  };

  const handleCategoryCreated = (category: Category) => {
    // Reload categories to update the list
    loadCategories();
    // Automatically select the newly created category
    handleInputChange('selectedCategories', [...formData.selectedCategories, category.id]);
  };

  return (
    <Paper elevation={3} sx={{ overflow: 'hidden' }}>
      <Box sx={{ px: 3, py: 2, bgcolor: 'primary.50', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" fontWeight="600" color="text.primary">
          {title}
        </Typography>
        <Button
          onClick={onCancel}
          startIcon={<CloseIcon />}
          variant="outlined"
          size="small"
          sx={{ minWidth: 'auto' }}
        >
          Close
        </Button>
      </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Title */}
          <TextField
            fullWidth
            required
            id="title"
            label="Title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter book title"
            disabled={loading}
            error={!!errors.title}
            helperText={errors.title}
          />

          {/* ISBN */}
          <TextField
            fullWidth
            required
            id="isbnCode"
            label="ISBN"
            value={formData.isbnCode}
            onChange={(e) => handleInputChange('isbnCode', e.target.value)}
            placeholder="e.g., 978-0-123-45678-9"
            disabled={loading}
            error={!!errors.isbnCode}
            helperText={errors.isbnCode}
            sx={{ fontFamily: 'monospace' }}
          />

          {/* Authors and Reading Status */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              alignItems: 'start'
            }}
          >
            {/* Authors */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Authors
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setAddAuthorDialogOpen(true)}
                  disabled={loading}
                  sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                >
                  Add
                </Button>
              </Box>
              <AuthorAutocomplete
                value={null}
                onChange={handleAuthorAdd}
                placeholder="Search and add authors..."
                disabled={loading}
              />
            </Box>

            {/* Status */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, height: '28px' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Reading Status
                </Typography>
              </Box>
              <FormControl fullWidth>
                <InputLabel id="status-label">Reading Status</InputLabel>
                <Select
                  labelId="status-label"
                  id="status"
                  value={formData.status || ''}
                  onChange={(e) => handleInputChange('status', e.target.value as Book['status'] || undefined)}
                  disabled={loading}
                  label="Reading Status"
                >
                  <MenuItem value="">No Status</MenuItem>
                  <MenuItem value="in progress">In Progress</MenuItem>
                  <MenuItem value="paused">Paused</MenuItem>
                  <MenuItem value="finished">Finished</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Selected Authors Display */}
          {formData.selectedAuthors.length > 0 && (
            <Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {formData.selectedAuthors.map((author) => (
                  <Chip
                    key={author.id}
                    label={`${author.name} ${author.surname}`}
                    onDelete={() => handleAuthorRemove(author.id)}
                    deleteIcon={<CloseIcon />}
                    disabled={loading}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Categories */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Categories
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setAddCategoryDialogOpen(true)}
                disabled={loading}
                sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
              >
                Add
              </Button>
            </Box>

            {categoriesLoading ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Loading categories...
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                  gap: 1,
                  maxHeight: 200,
                  overflowY: 'auto',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2
                }}
              >
                {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((category) => (
                  <FormControlLabel
                    key={category.id}
                    control={
                      <Checkbox
                        checked={formData.selectedCategories.includes(category.id)}
                        onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                        disabled={loading}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {category.name}
                      </Typography>
                    }
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Edition Info */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2
            }}
          >
            {/* Edition Number */}
            <TextField
              fullWidth
              type="number"
              id="editionNumber"
              label="Edition Number"
              value={formData.editionNumber || ''}
              onChange={(e) => handleInputChange('editionNumber', 
                e.target.value ? parseInt(e.target.value) : undefined
              )}
              placeholder="e.g., 1"
              inputProps={{ min: 1 }}
              disabled={loading}
              error={!!errors.editionNumber}
              helperText={errors.editionNumber}
            />

            {/* Edition Date */}
            <TextField
              fullWidth
              type="date"
              id="editionDate"
              label="Edition Date"
              value={formData.editionDate}
              onChange={(e) => handleInputChange('editionDate', e.target.value)}
              disabled={loading}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>

          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={4}
            id="notes"
            label="Notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Add any notes about this book..."
            disabled={loading}
          />

          <Divider />
          
          {/* Form Actions */}
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              justifyContent: 'flex-end',
              pt: 2,
              borderTop: 1,
              borderColor: 'divider'
            }}
          >
            <Button
              type="button"
              variant="outlined"
              size="large"
              onClick={onCancel}
              disabled={loading}
              startIcon={<CancelIcon />}
              sx={{ minWidth: 120, order: { xs: 2, sm: 1 } }}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              sx={{ 
                minWidth: 160, 
                order: { xs: 1, sm: 2 },
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              {loading ? 'Saving...' : book ? 'Update Book' : 'Save Book'}
            </Button>
          </Box>
        </Stack>
      </Box>

      {/* Dialogs */}
      <AddAuthorDialog
        open={addAuthorDialogOpen}
        onClose={() => setAddAuthorDialogOpen(false)}
        onAuthorCreated={handleAuthorCreated}
      />

      <AddCategoryDialog
        open={addCategoryDialogOpen}
        onClose={() => setAddCategoryDialogOpen(false)}
        onCategoryCreated={handleCategoryCreated}
      />
    </Paper>
  );
};