import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { Category } from '../../types';
import { useApi } from '../../contexts/ApiContext';

interface AddCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onCategoryCreated: (category: Category) => void;
}

export const AddCategoryDialog: React.FC<AddCategoryDialogProps> = ({
  open,
  onClose,
  onCategoryCreated
}) => {
  const { categoryAPI } = useApi();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleClose = () => {
    if (!loading) {
      setName('');
      setError('');
      onClose();
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Category name is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const newCategory = await categoryAPI.createCategory({
        name: name.trim()
      });

      onCategoryCreated(newCategory);
      handleClose();
    } catch (error) {
      console.error('Failed to create category:', error);
      setError('Failed to create category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    setName(value);
    if (error) {
      setError('');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Category</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              required
              label="Category Name"
              value={name}
              onChange={(e) => handleChange(e.target.value)}
              error={!!error}
              helperText={error}
              disabled={loading}
              placeholder="e.g., Science Fiction, Mystery, Biography"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            startIcon={<CloseIcon />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {loading ? 'Creating...' : 'Create Category'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
