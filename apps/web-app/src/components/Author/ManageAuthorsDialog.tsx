import React, { useEffect, useMemo, useState } from 'react';
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
import type { Author } from '@my-many-books/shared-types';
import { ENTITY_MANAGE_ERROR_CODES } from '@my-many-books/shared-types';
import { useManageAuthors } from '@my-many-books/shared-ui-hooks';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../contexts/ApiContext';

interface ManageAuthorsDialogProps {
  open: boolean;
  onClose: () => void;
  onAuthorUpdated?: (author: Author) => void;
  onAuthorDeleted?: (authorId: number) => void;
}

export const ManageAuthorsDialog: React.FC<ManageAuthorsDialogProps> = ({
  open,
  onClose,
  onAuthorUpdated,
  onAuthorDeleted,
}) => {
  const { t } = useTranslation();
  const { authorAPI } = useApi();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({ name: '', surname: '', nationality: '' });
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingForceDeleteId, setPendingForceDeleteId] = useState<number | null>(null);

  const authorsApi = useMemo(
    () => ({
      getAuthors: () => authorAPI.getAuthors(),
      createAuthor: (data: { name: string; surname: string; nationality?: string }) => authorAPI.createAuthor(data),
      updateAuthor: (id: number, data: Partial<{ name: string; surname: string; nationality?: string | null }>) =>
        authorAPI.updateAuthor(id, data),
      deleteAuthor: (id: number, force?: boolean) => authorAPI.deleteAuthor(id, force),
    }),
    [authorAPI]
  );

  const {
    authors,
    loading,
    mutating,
    error,
    clearError,
    loadAuthors,
    updateAuthor,
    deleteAuthor,
  } = useManageAuthors<Author>(authorsApi, { autoLoad: false });

  useEffect(() => {
    if (open) {
      void loadAuthors();
    } else {
      setSearchTerm('');
      setEditingId(null);
      setPendingDeleteId(null);
      setPendingForceDeleteId(null);
      clearError();
    }
  }, [open, loadAuthors, clearError]);

  const visibleAuthors = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return authors;

    return authors.filter((author) => {
      const fullName = `${author.name} ${author.surname}`.toLowerCase();
      const reverseName = `${author.surname} ${author.name}`.toLowerCase();
      const nationality = author.nationality?.toLowerCase() ?? '';
      return (
        fullName.includes(term) || reverseName.includes(term) || nationality.includes(term)
      );
    });
  }, [authors, searchTerm]);

  const startEdit = (author: Author) => {
    clearError();
    setPendingDeleteId(null);
    setEditingId(author.id);
    setEditDraft({
      name: author.name,
      surname: author.surname,
      nationality: author.nationality ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({ name: '', surname: '', nationality: '' });
    clearError();
  };

  const handleSaveEdit = async () => {
    if (editingId == null) return;
    const result = await updateAuthor(editingId, {
      name: editDraft.name,
      surname: editDraft.surname,
      nationality: editDraft.nationality,
    });

    if (result.success && result.data) {
      onAuthorUpdated?.(result.data);
      cancelEdit();
    }
  };

  const confirmDelete = async () => {
    if (pendingDeleteId == null) return;
    const result = await deleteAuthor(pendingDeleteId);
    if (result.success) {
      onAuthorDeleted?.(pendingDeleteId);
      setPendingDeleteId(null);
    } else if (result.error.code === ENTITY_MANAGE_ERROR_CODES.HAS_BOOKS) {
      clearError();
      setPendingForceDeleteId(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  const confirmForceDelete = async () => {
    if (pendingForceDeleteId == null) return;
    const id = pendingForceDeleteId;
    setPendingForceDeleteId(null);
    const result = await deleteAuthor(id, true);
    if (result.success) {
      onAuthorDeleted?.(id);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={mutating ? undefined : onClose}
      maxWidth="md"
      fullWidth
      data-tour-id="entity-manage-dialog"
    >
      <DialogTitle>{t('dialogs:author.manage_title', { defaultValue: 'Manage authors' })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={clearError}>
              {t(error.i18nKey, {
                defaultValue:
                  error.message || t('dialogs:author.load_failed', { defaultValue: 'Failed to load authors. Please try again.' }),
              })}
            </Alert>
          )}

          <TextField
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            label={t('dialogs:author.search_label', { defaultValue: 'Filter authors' })}
            placeholder={t('dialogs:author.search_placeholder', {
              defaultValue: 'Type name, surname or nationality',
            })}
            disabled={loading || mutating}
          />

          {loading ? (
            <Box display="flex" alignItems="center" justifyContent="center" py={4} gap={1}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                {t('dialogs:author.loading', { defaultValue: 'Loading authors...' })}
              </Typography>
            </Box>
          ) : (
            <List dense sx={{ border: 1, borderColor: 'divider', borderRadius: 1, maxHeight: 360, overflowY: 'auto' }}>
              {visibleAuthors.map((author) => {
                const isEditing = editingId === author.id;
                return (
                  <ListItem
                    key={author.id}
                    divider
                    alignItems="flex-start"
                    secondaryAction={
                      !isEditing && (
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title={t('common:edit')}>
                            <span>
                              <IconButton
                                edge="end"
                                aria-label={t('common:edit')}
                                size="small"
                                onClick={() => startEdit(author)}
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
                                aria-label={t('common:delete')}
                                size="small"
                                onClick={() => {
                                  clearError();
                                  setEditingId(null);
                                  setPendingDeleteId(author.id);
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
                      <Stack spacing={1} sx={{ width: '100%' }}>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 1,
                          }}
                        >
                          <TextField
                            size="small"
                            label={t('dialogs:author.name_label')}
                            value={editDraft.name}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
                            disabled={mutating}
                          />
                          <TextField
                            size="small"
                            label={t('dialogs:author.surname_label')}
                            value={editDraft.surname}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, surname: e.target.value }))}
                            disabled={mutating}
                          />
                        </Box>
                        <TextField
                          size="small"
                          label={t('dialogs:author.nationality_label')}
                          value={editDraft.nationality}
                          onChange={(e) => setEditDraft((prev) => ({ ...prev, nationality: e.target.value }))}
                          disabled={mutating}
                        />
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" onClick={cancelEdit} disabled={mutating} startIcon={<CloseIcon />}>
                            {t('common:cancel')}
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => void handleSaveEdit()}
                            disabled={mutating}
                            startIcon={mutating ? <CircularProgress size={14} /> : <SaveIcon />}
                          >
                            {t('dialogs:author.update_button', { defaultValue: 'Save author' })}
                          </Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <ListItemText
                        primary={`${author.name} ${author.surname}`}
                        secondary={author.nationality || undefined}
                      />
                    )}
                  </ListItem>
                );
              })}
              {!visibleAuthors.length && (
                <ListItem>
                  <ListItemText
                    primary={t('dialogs:author.no_results', { defaultValue: 'No authors found' })}
                  />
                </ListItem>
              )}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button onClick={() => void loadAuthors()} disabled={loading || mutating}>
          {t('common:retry')}
        </Button>
        <Button onClick={onClose} disabled={mutating} startIcon={<CloseIcon />}>
          {t('common:close')}
        </Button>
      </DialogActions>

      <Dialog open={pendingDeleteId != null} onClose={mutating ? undefined : () => setPendingDeleteId(null)}>
        <DialogTitle>
          {t('dialogs:author.delete_confirm_title', { defaultValue: 'Delete author?' })}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('dialogs:author.delete_confirm_message', {
              defaultValue: 'This will remove the author from your author list. This action cannot be undone.',
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
            {t('dialogs:author.delete_button', { defaultValue: 'Delete author' })}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pendingForceDeleteId != null} onClose={mutating ? undefined : () => setPendingForceDeleteId(null)}>
        <DialogTitle>
          {t('dialogs:author.delete_confirm_title', { defaultValue: 'Delete author?' })}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('dialogs:author.delete_blocked_has_books', {
              defaultValue: 'This author is assigned to one or more books. Do you still want to delete it?',
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingForceDeleteId(null)} disabled={mutating}>
            {t('common:cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void confirmForceDelete()}
            disabled={mutating}
            startIcon={mutating ? <CircularProgress size={14} /> : <DeleteIcon />}
          >
            {t('dialogs:author.delete_force_button', { defaultValue: 'Delete anyway' })}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};
