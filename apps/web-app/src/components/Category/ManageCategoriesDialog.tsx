import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import type { Category } from '@my-many-books/shared-types';
import { useManageCategories } from '@my-many-books/shared-ui-hooks';
import { createCategoryDisplayNameComparator, getCategoryDisplayName } from '@my-many-books/shared-utils';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../contexts/ApiContext';

interface ManageCategoriesDialogProps {
  open: boolean;
  onClose: () => void;
  onCategoryUpdated?: (category: Category) => void;
  onCategoryDeleted?: (categoryId: number) => void;
}

export const ManageCategoriesDialog: React.FC<ManageCategoriesDialogProps> = ({
  open,
  onClose,
  onCategoryUpdated,
  onCategoryDeleted,
}) => {
  const { t, i18n } = useTranslation(['common', 'dialogs', 'categories']);
  const { categoryAPI } = useApi();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const categorySortComparator = React.useMemo(
    () => createCategoryDisplayNameComparator<Category>(t, i18n.language),
    [t, i18n.language]
  );

  const categoriesApi = React.useMemo(
    () => ({
      getCategories: () => categoryAPI.getCategories(),
      createCategory: (data: { name: string }) => categoryAPI.createCategory(data),
      updateCategory: (id: number, data: Partial<{ name: string }>) => categoryAPI.updateCategory(id, data),
      deleteCategory: (id: number) => categoryAPI.deleteCategory(id),
    }),
    [categoryAPI]
  );

  const {
    categories,
    loading,
    sorting,
    mutating,
    error,
    clearError,
    loadCategories,
    updateCategory,
    deleteCategory,
  } = useManageCategories<Category>(categoriesApi, {
    autoLoad: false,
    sortComparator: categorySortComparator,
  });

  useEffect(() => {
    if (open) {
      void loadCategories();
    } else {
      setEditingId(null);
      setEditName('');
      setPendingDeleteId(null);
      clearError();
    }
  }, [open, loadCategories, clearError]);

  const startEdit = (category: Category) => {
    clearError();
    setPendingDeleteId(null);
    setEditingId(category.id);
    setEditName(category.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    clearError();
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const result = await updateCategory(editingId, { name: editName });
    if (result.success && result.data) {
      onCategoryUpdated?.(result.data);
      cancelEdit();
    }
  };

  const confirmDelete = async () => {
    if (pendingDeleteId == null) return;
    const result = await deleteCategory(pendingDeleteId);
    if (result.success) {
      onCategoryDeleted?.(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  return (
    <Dialog open={open} onClose={mutating ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('dialogs:category.manage_title', { defaultValue: 'Manage categories' })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={clearError}>
              {t(error.i18nKey, {
                defaultValue:
                  error.message ||
                  t('dialogs:category.load_failed', { defaultValue: 'Failed to load categories. Please try again.' }),
              })}
            </Alert>
          )}

          {loading || sorting ? (
            <Box display="flex" alignItems="center" justifyContent="center" py={4} gap={1}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                {t('dialogs:category.loading', { defaultValue: 'Loading categories...' })}
              </Typography>
            </Box>
          ) : (
            <List dense sx={{ border: 1, borderColor: 'divider', borderRadius: 1, maxHeight: 360, overflowY: 'auto' }}>
              {categories.map((category) => {
                const isEditing = editingId === category.id;
                return (
                  <ListItem
                    key={category.id}
                    divider
                    secondaryAction={
                      !isEditing && (
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title={t('common:edit')}>
                            <span>
                              <IconButton
                                edge="end"
                                size="small"
                                aria-label={t('common:edit')}
                                onClick={() => startEdit(category)}
                                disabled={mutating}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={t('common:delete')}>
                            <span>
                              <IconButton
                                edge="end"
                                size="small"
                                aria-label={t('common:delete')}
                                onClick={() => {
                                  clearError();
                                  setEditingId(null);
                                  setPendingDeleteId(category.id);
                                }}
                                disabled={mutating}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      )
                    }
                    sx={{ pr: isEditing ? 2 : 10 }}
                  >
                    {isEditing ? (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: '100%' }}>
                        <TextField
                          size="small"
                          label={t('dialogs:category.name_label')}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={mutating}
                          fullWidth
                        />
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" onClick={cancelEdit} disabled={mutating} startIcon={<CloseIcon />}>
                            {t('common:cancel')}
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => void saveEdit()}
                            disabled={mutating}
                            startIcon={mutating ? <CircularProgress size={14} /> : <SaveIcon />}
                          >
                            {t('dialogs:category.update_button', { defaultValue: 'Save category' })}
                          </Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <ListItemText primary={getCategoryDisplayName(category, t)} />
                    )}
                  </ListItem>
                );
              })}
              {!categories.length && (
                <ListItem>
                  <ListItemText
                    primary={t('dialogs:category.no_results', { defaultValue: 'No categories found' })}
                  />
                </ListItem>
              )}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button onClick={() => void loadCategories()} disabled={loading || mutating}>
          {t('common:retry')}
        </Button>
        <Button onClick={onClose} disabled={mutating} startIcon={<CloseIcon />}>
          {t('common:close')}
        </Button>
      </DialogActions>

      <Dialog open={pendingDeleteId != null} onClose={mutating ? undefined : () => setPendingDeleteId(null)}>
        <DialogTitle>
          {t('dialogs:category.delete_confirm_title', { defaultValue: 'Delete category?' })}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('dialogs:category.delete_confirm_message', {
              defaultValue: 'This will remove the category from your category list. This action cannot be undone.',
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteId(null)} disabled={mutating}>
            {t('common:cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void confirmDelete()}
            disabled={mutating}
            startIcon={mutating ? <CircularProgress size={14} /> : <DeleteIcon />}
          >
            {t('dialogs:category.delete_button', { defaultValue: 'Delete category' })}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};
