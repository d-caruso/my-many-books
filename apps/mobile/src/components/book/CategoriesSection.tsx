import React from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Button, Chip, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Category } from '@/types';
import { addBookStyles as styles } from './addBookStyles';

interface CategoriesSectionProps {
  categoriesLoading: boolean;
  availableCategories: Category[];
  selectedCategoryIds: number[];
  onOpenSelector: () => void;
  onOpenAdd: () => void;
  onToggleCategory: (categoryId: number) => void;
}

export function CategoriesSection({
  categoriesLoading,
  availableCategories,
  selectedCategoryIds,
  onOpenSelector,
  onOpenAdd,
  onToggleCategory,
}: CategoriesSectionProps) {
  const { t } = useTranslation();

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <Text variant="titleSmall" style={styles.sectionTitle} accessibilityRole="header">
          {t('books:categories')}
        </Text>
        <View style={styles.sectionActionsRow}>
          <Button mode="outlined" compact style={styles.sectionActionButton} onPress={onOpenSelector}>
            {t('books:select_category')}
          </Button>
          <Button mode="outlined" compact style={styles.sectionActionButton} onPress={onOpenAdd}>
            {t('books:add_category')}
          </Button>
        </View>
      </View>

      {categoriesLoading ? (
        <View style={styles.categoriesLoadingRow}>
          <ActivityIndicator size={16} />
          <Text variant="bodySmall">{t('books:loading_categories')}</Text>
        </View>
      ) : null}

      {selectedCategoryIds.length ? (
        <View style={styles.selectedChipsRow}>
          {selectedCategoryIds.map((categoryId) => {
            const category = availableCategories.find((item) => Number(item.id) === categoryId);
            return (
              <Chip key={String(categoryId)} onClose={() => onToggleCategory(categoryId)}>
                {category?.name ?? `${t('books:category')} #${categoryId}`}
              </Chip>
            );
          })}
        </View>
      ) : (
        <Text variant="bodySmall" style={styles.emptyHint}>
          {t('books:select_category')}
        </Text>
      )}
    </>
  );
}

export default CategoriesSection;
