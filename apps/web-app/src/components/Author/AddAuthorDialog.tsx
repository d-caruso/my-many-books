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
import { Author } from '../../types';
import { useApi } from '../../contexts/ApiContext';

interface AddAuthorDialogProps {
  open: boolean;
  onClose: () => void;
  onAuthorCreated: (author: Author) => void;
}

export const AddAuthorDialog: React.FC<AddAuthorDialogProps> = ({
  open,
  onClose,
  onAuthorCreated
}) => {
  const { t } = useTranslation();
  const { authorAPI } = useApi();
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    nationality: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});

  const handleClose = () => {
    if (!loading) {
      setFormData({ name: '', surname: '', nationality: '' });
      setErrors({});
      onClose();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof typeof formData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('dialogs:author.name_required');
    }

    if (!formData.surname.trim()) {
      newErrors.surname = t('dialogs:author.surname_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const newAuthor = await authorAPI.createAuthor({
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        nationality: formData.nationality.trim() || undefined
      });

      onAuthorCreated(newAuthor);
      handleClose();
    } catch (error) {
      console.error('Failed to create author:', error);
      setErrors({ name: t('dialogs:author.create_failed') });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('dialogs:author.add_title')}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              required
              label={t('dialogs:author.name_label')}
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              disabled={loading}
            />

            <TextField
              fullWidth
              required
              label={t('dialogs:author.surname_label')}
              value={formData.surname}
              onChange={(e) => handleChange('surname', e.target.value)}
              error={!!errors.surname}
              helperText={errors.surname}
              disabled={loading}
            />

            <TextField
              fullWidth
              label={t('dialogs:author.nationality_label')}
              value={formData.nationality}
              onChange={(e) => handleChange('nationality', e.target.value)}
              error={!!errors.nationality}
              helperText={errors.nationality}
              disabled={loading}
              placeholder={t('dialogs:author.nationality_placeholder')}
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
            {loading ? t('dialogs:author.creating') : t('dialogs:author.create_button')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
