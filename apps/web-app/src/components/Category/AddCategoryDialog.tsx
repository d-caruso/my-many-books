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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      setError(t('dialogs:category.name_required'));
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
    } catch (error: any) {
      console.error('Failed to create category:', error);
      const errorMessage = error?.response?.data?.error || t('dialogs:category.create_failed');
      setError(errorMessage);
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
      <DialogTitle>{t('dialogs:category.add_title')}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              required
              label={t('dialogs:category.name_label')}
              value={name}
              onChange={(e) => handleChange(e.target.value)}
              error={!!error}
              helperText={error}
              disabled={loading}
              placeholder={t('dialogs:category.name_placeholder')}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            startIcon={<CloseIcon />}
          >
            {t('common:cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {loading ? t('dialogs:category.creating') : t('dialogs:category.create_button')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
