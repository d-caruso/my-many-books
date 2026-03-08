import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import type { Category } from '@my-many-books/shared-types';
import { ERROR_CODES } from '@my-many-books/shared-types';
import { useApi } from '../../contexts/ApiContext';
import { getErrorCode } from '../../utils/errorTranslation';

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
  const [fieldError, setFieldError] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleClose = () => {
    if (!loading) {
      setName('');
      setFieldError('');
      setFormError(null);
      onClose();
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setFieldError(t('dialogs:category.name_required'));
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
    setFormError(null);
    try {
      const newCategory = await categoryAPI.createCategory({
        name: name.trim()
      });

      onCategoryCreated(newCategory);
      handleClose();
    } catch (error: any) {
      console.error('Failed to create category:', error);
      if (getErrorCode(error) === ERROR_CODES.DUPLICATE_CATEGORY) {
        setFormError(t('dialogs:category.duplicate_category'));
      } else {
        setFormError(t('dialogs:category.create_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    setName(value);
    if (fieldError) {
      setFieldError('');
    }
    if (formError) {
      setFormError(null);
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
              error={!!fieldError}
              helperText={fieldError}
              disabled={loading}
              placeholder={t('dialogs:category.name_placeholder')}
            />
          </Stack>
        </DialogContent>

        {formError && (
          <Alert severity="warning" sx={{ mx: 3 }}>
            {formError}
          </Alert>
        )}

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
