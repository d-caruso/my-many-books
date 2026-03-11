import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, List, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useManageAuthors } from '@my-many-books/shared-ui-hooks';
import type { Author } from '@my-many-books/shared-types';
import { authorAPI } from '@/services/api';

interface ManageAuthorsDialogProps {
  visible: boolean;
  onClose: () => void;
  onAuthorUpdated?: (author: Author) => void;
  onAuthorDeleted?: (authorId: number) => void;
}

export function ManageAuthorsDialog({
  visible,
  onClose,
  onAuthorUpdated,
  onAuthorDeleted,
}: ManageAuthorsDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editSurname, setEditSurname] = useState('');
  const [editNationality, setEditNationality] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const api = useMemo(
    () => ({
      getAuthors: () => authorAPI.getAuthors(),
      createAuthor: (data: { name: string; surname: string; nationality?: string }) => authorAPI.createAuthor(data),
      updateAuthor: (
        id: number,
        data: Partial<{ name: string; surname: string; nationality?: string | null }>
      ) => authorAPI.updateAuthor(id, data),
      deleteAuthor: (id: number) => authorAPI.deleteAuthor(id),
    }),
    []
  );

  const resetDialogState = () => {
    setSearch('');
    setEditingId(null);
    setEditName('');
    setEditSurname('');
    setEditNationality('');
    setPendingDeleteId(null);
    clearError();
  };

  const {
    authors,
    loading,
    mutating,
    error,
    clearError,
    loadAuthors,
    updateAuthor,
    deleteAuthor,
  } = useManageAuthors<Author>(api, { autoLoad: false });

  useEffect(() => {
    if (visible) {
      void loadAuthors();
    }
  }, [visible, loadAuthors]);

  const handleDialogClose = () => {
    resetDialogState();
    onClose();
  };

  const filteredAuthors = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return authors;

    return authors.filter((author) => {
      const full = `${author.name} ${author.surname}`.toLowerCase();
      const reverse = `${author.surname} ${author.name}`.toLowerCase();
      const nationality = author.nationality?.toLowerCase() ?? '';
      return full.includes(term) || reverse.includes(term) || nationality.includes(term);
    });
  }, [authors, search]);

  const handleStartEdit = (author: Author) => {
    clearError();
    setPendingDeleteId(null);
    setEditingId(Number(author.id));
    setEditName(author.name);
    setEditSurname(author.surname);
    setEditNationality(author.nationality ?? '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditSurname('');
    setEditNationality('');
    clearError();
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    const result = await updateAuthor(editingId, {
      name: editName,
      surname: editSurname,
      nationality: editNationality,
    });

    if (result.success && result.data) {
      onAuthorUpdated?.(result.data);
      handleCancelEdit();
    }
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteId === null) return;
    const result = await deleteAuthor(pendingDeleteId);
    if (result.success) {
      onAuthorDeleted?.(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={mutating ? undefined : handleDialogClose}>
        <Dialog.Title>{t('dialogs:author.manage_title', { defaultValue: 'Manage authors' })}</Dialog.Title>
        <Dialog.Content>
          <View style={styles.content}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer }]}>
                <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
                  {t(error.i18nKey, {
                    defaultValue:
                      error.message ||
                      t('dialogs:author.load_failed', { defaultValue: 'Failed to load authors. Please try again.' }),
                  })}
                </Text>
              </View>
            ) : null}

            <TextInput
              label={t('dialogs:author.search_label', { defaultValue: 'Filter authors' })}
              value={search}
              onChangeText={setSearch}
              placeholder={t('dialogs:author.search_placeholder', {
                defaultValue: 'Type name, surname or nationality',
              })}
              disabled={loading || mutating}
            />

            {editingId != null ? (
              <View style={[styles.editorBox, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
                <Text variant="bodySmall" style={[styles.editorLabel, { color: theme.colors.onSurface }]}>
                  {t('common:edit')}
                </Text>
                <TextInput
                  label={t('dialogs:author.name_label')}
                  value={editName}
                  onChangeText={setEditName}
                  disabled={mutating}
                />
                <TextInput
                  label={t('dialogs:author.surname_label')}
                  value={editSurname}
                  onChangeText={setEditSurname}
                  disabled={mutating}
                />
                <TextInput
                  label={t('dialogs:author.nationality_label')}
                  value={editNationality}
                  onChangeText={setEditNationality}
                  disabled={mutating}
                />
                <View style={styles.inlineActionsRow}>
                  <Button onPress={handleCancelEdit} disabled={mutating}>
                    {t('common:cancel')}
                  </Button>
                  <Button onPress={() => void handleSaveEdit()} loading={mutating} disabled={mutating}>
                    {t('dialogs:author.update_button', { defaultValue: 'Save author' })}
                  </Button>
                </View>
              </View>
            ) : null}

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {loading ? (
                <Text variant="bodySmall" style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
                  {t('dialogs:author.loading', { defaultValue: 'Loading authors...' })}
                </Text>
              ) : null}

              {!loading &&
                filteredAuthors.map((author) => (
                  <List.Item
                    key={String(author.id)}
                    title={`${author.name} ${author.surname}`}
                    description={author.nationality || undefined}
                    right={() => (
                      <View style={styles.listActionsRow}>
                        <Button compact onPress={() => handleStartEdit(author)} disabled={mutating}>
                          {t('common:edit')}
                        </Button>
                        <Button
                          compact
                          onPress={() => {
                            clearError();
                            setEditingId(null);
                            setPendingDeleteId(Number(author.id));
                          }}
                          disabled={mutating}
                          textColor={theme.colors.error}
                        >
                          {t('common:delete')}
                        </Button>
                      </View>
                    )}
                  />
                ))}

              {!loading && filteredAuthors.length === 0 ? (
                <Text variant="bodySmall" style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
                  {t('dialogs:author.no_results', { defaultValue: 'No authors found' })}
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => void loadAuthors()} disabled={loading || mutating}>
            {t('common:retry')}
          </Button>
          <Button onPress={handleDialogClose} disabled={mutating}>
            {t('common:close')}
          </Button>
        </Dialog.Actions>
      </Dialog>

      <Dialog visible={pendingDeleteId != null} onDismiss={mutating ? undefined : () => setPendingDeleteId(null)}>
        <Dialog.Title>
          {t('dialogs:author.delete_confirm_title', { defaultValue: 'Delete author?' })}
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="bodySmall">
            {t('dialogs:author.delete_confirm_message', {
              defaultValue: 'This will remove the author from your author list. This action cannot be undone.',
            })}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setPendingDeleteId(null)} disabled={mutating}>
            {t('common:cancel')}
          </Button>
          <Button onPress={() => void handleConfirmDelete()} loading={mutating} disabled={mutating}>
            {t('dialogs:author.delete_button', { defaultValue: 'Delete author' })}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  errorBox: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: {},
  editorBox: {
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  editorLabel: {
    fontWeight: '600',
  },
  inlineActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    paddingVertical: 4,
  },
  helperText: {
    textAlign: 'center',
    paddingVertical: 12,
  },
  listActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default ManageAuthorsDialog;
