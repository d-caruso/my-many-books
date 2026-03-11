import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Checkbox, Dialog, List, Portal, RadioButton, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Category } from '@my-many-books/shared-types';
import { getCategoryDisplayName } from '@my-many-books/shared-utils';

interface CategorySelectorModalProps {
  visible: boolean;
  categories: Category[];
  selectedCategoryIds: number[];
  loading?: boolean;
  singleSelect?: boolean;
  onClose: () => void;
  onToggleCategory: (categoryId: number) => void;
  onAddCategoryPress?: () => void;
}

export function CategorySelectorModal({
  visible,
  categories,
  selectedCategoryIds,
  loading = false,
  singleSelect = false,
  onClose,
  onToggleCategory,
  onAddCategoryPress,
}: CategorySelectorModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose}>
        <Dialog.Title>{t('books:select_category')}</Dialog.Title>
        <Dialog.Content>
          <View style={styles.content}>
            {onAddCategoryPress ? (
              <Button mode="outlined" onPress={onAddCategoryPress}>
                {t('books:add_category')}
              </Button>
            ) : null}

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {loading ? (
                <Text variant="bodySmall" style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
                  {t('books:loading_categories')}
                </Text>
              ) : null}

              {!loading &&
                categories.map((category) => {
                  const categoryId = Number(category.id);
                  const checked = selectedCategoryIds.includes(categoryId);
                  return (
                    <List.Item
                      key={String(category.id)}
                      title={getCategoryDisplayName(category, t)}
                      onPress={() => {
                        onToggleCategory(categoryId);
                        if (singleSelect) onClose();
                      }}
                      left={() =>
                        singleSelect ? (
                          <RadioButton
                            value={String(categoryId)}
                            status={checked ? 'checked' : 'unchecked'}
                            onValueChange={() => {
                              onToggleCategory(categoryId);
                              onClose();
                            }}
                          />
                        ) : (
                          <Checkbox status={checked ? 'checked' : 'unchecked'} />
                        )
                      }
                    />
                  );
                })}

              {!loading && categories.length === 0 ? (
                <Text variant="bodySmall" style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
                  {t('books:no_categories_found', { defaultValue: 'No categories found' })}
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose}>{t('common:done', { defaultValue: 'Done' })}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    paddingVertical: 4,
  },
  helperText: {
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export default CategorySelectorModal;
