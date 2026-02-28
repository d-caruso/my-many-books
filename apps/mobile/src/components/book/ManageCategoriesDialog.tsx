import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, List, Portal, Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useManageCategories } from '@my-many-books/shared-ui-hooks';
import { createCategoryDisplayNameComparator, getCategoryDisplayName } from '@my-many-books/shared-utils';
import type { Category } from '@my-many-books/shared-types';
import { categoryAPI } from '@/services/api';

interface ManageCategoriesDialogProps {
  visible: boolean;
  onClose: () => void;
  onCategoryUpdated?: (category: Category) => void;
  onCategoryDeleted?: (categoryId: number) => void;
}

export function ManageCategoriesDialog({
  visible,
  onClose,
  onCategoryUpdated,
  onCategoryDeleted,
}: ManageCategoriesDialogProps) {
  const { t, i18n } = useTranslation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const categorySortComparator = useMemo(
    () => createCategoryDisplayNameComparator<Category>(t, i18n.language),
    [t, i18n.language]
  );

  const api = useMemo(
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
  } = useManageCategories<Category>(api, {
    autoLoad: false,
    sortComparator: categorySortComparator,
  });

  useEffect(() => {
    if (visible) {
      void loadCategories();
      return;
    }

    setEditingId(null);
    setEditName('');
    setPendingDeleteId(null);
    clearError();
  }, [visible, loadCategories, clearError]);

  const handleStartEdit = (category: Category) => {
    clearError();
    setPendingDeleteId(null);
    setEditingId(Number(category.id));
    setEditName(category.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    clearError();
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    const result = await updateCategory(editingId, { name: editName });
    if (result.success && result.data) {
      onCategoryUpdated?.(result.data);
      handleCancelEdit();
    }
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteId === null) return;
    const result = await deleteCategory(pendingDeleteId);
    if (result.success) {
      onCategoryDeleted?.(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={mutating ? undefined : onClose}>
        <Dialog.Title>{t('dialogs:category.manage_title', { defaultValue: 'Manage categories' })}</Dialog.Title>
        <Dialog.Content>
          <View style={styles.content}>
            {error ? (
              <View style={styles.errorBox}>
                <Text variant="bodySmall" style={styles.errorText}>
                  {t(error.i18nKey, {
                    defaultValue:
                      error.message ||
                      t('dialogs:category.load_failed', { defaultValue: 'Failed to load categories. Please try again.' }),
                  })}
                </Text>
              </View>
            ) : null}

            {editingId != null ? (
              <View style={styles.editorBox}>
                <Text variant="bodySmall" style={styles.editorLabel}>
                  {t('common:edit')}
                </Text>
                <TextInput
                  label={t('dialogs:category.name_label')}
                  value={editName}
                  onChangeText={setEditName}
                  disabled={mutating}
                />
                <View style={styles.inlineActionsRow}>
                  <Button onPress={handleCancelEdit} disabled={mutating}>
                    {t('common:cancel')}
                  </Button>
                  <Button onPress={() => void handleSaveEdit()} loading={mutating} disabled={mutating}>
                    {t('dialogs:category.update_button', { defaultValue: 'Save category' })}
                  </Button>
                </View>
              </View>
            ) : null}

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {loading || sorting ? (
                <Text variant="bodySmall" style={styles.helperText}>
                  {t('dialogs:category.loading', { defaultValue: 'Loading categories...' })}
                </Text>
              ) : null}

              {!loading && !sorting &&
                categories.map((category) => (
                  <List.Item
                    key={String(category.id)}
                    title={getCategoryDisplayName(category, t)}
                    right={() => (
                      <View style={styles.listActionsRow}>
                        <Button compact onPress={() => handleStartEdit(category)} disabled={mutating}>
                          {t('common:edit')}
                        </Button>
                        <Button
                          compact
                          onPress={() => {
                            clearError();
                            setEditingId(null);
                            setPendingDeleteId(Number(category.id));
                          }}
                          disabled={mutating}
                          textColor="#b91c1c"
                        >
                          {t('common:delete')}
                        </Button>
                      </View>
                    )}
                  />
                ))}

              {!loading && !sorting && categories.length === 0 ? (
                <Text variant="bodySmall" style={styles.helperText}>
                  {t('dialogs:category.no_results', { defaultValue: 'No categories found' })}
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => void loadCategories()} disabled={loading || mutating}>
            {t('common:retry')}
          </Button>
          <Button onPress={onClose} disabled={mutating}>
            {t('common:close')}
          </Button>
        </Dialog.Actions>
      </Dialog>

      <Dialog visible={pendingDeleteId != null} onDismiss={mutating ? undefined : () => setPendingDeleteId(null)}>
        <Dialog.Title>
          {t('dialogs:category.delete_confirm_title', { defaultValue: 'Delete category?' })}
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="bodySmall">
            {t('dialogs:category.delete_confirm_message', {
              defaultValue: 'This will remove the category from your category list. This action cannot be undone.',
            })}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setPendingDeleteId(null)} disabled={mutating}>
            {t('common:cancel')}
          </Button>
          <Button onPress={() => void handleConfirmDelete()} loading={mutating} disabled={mutating}>
            {t('dialogs:category.delete_button', { defaultValue: 'Delete category' })}
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
    backgroundColor: '#ffebee',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: {
    color: '#b91c1c',
  },
  editorBox: {
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  editorLabel: {
    color: '#334155',
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
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 12,
  },
  listActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default ManageCategoriesDialog;
