import React from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Button, Chip, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Author } from '@/types';
import { addBookStyles as styles } from './addBookStyles';

interface AuthorsSectionProps {
  selectedAuthors: Author[];
  authorsLoading: boolean;
  onOpenSelector: () => void;
  onOpenManage: () => void;
  onOpenAdd: () => void;
  onRemoveAuthor: (authorId: number) => void;
}

export function AuthorsSection({
  selectedAuthors,
  authorsLoading,
  onOpenSelector,
  onOpenManage,
  onOpenAdd,
  onRemoveAuthor,
}: AuthorsSectionProps) {
  const { t } = useTranslation();

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <Text variant="titleSmall" style={styles.sectionTitle} accessibilityRole="header">
          {t('books:authors')}
        </Text>
        <View style={styles.sectionActionsRow}>
          <Button mode="outlined" compact style={styles.sectionActionButton} onPress={onOpenSelector}>
            {t('books:select_author')}
          </Button>
          <Button mode="outlined" compact style={styles.sectionActionButton} onPress={onOpenManage}>
            {t('common:manage', { defaultValue: 'Manage' })}
          </Button>
          <Button mode="outlined" compact style={styles.sectionActionButton} onPress={onOpenAdd}>
            {t('books:add_author')}
          </Button>
        </View>
      </View>

      {authorsLoading ? (
        <View style={styles.categoriesLoadingRow}>
          <ActivityIndicator size={16} />
          <Text variant="bodySmall">{t('books:type_to_search_authors')}</Text>
        </View>
      ) : null}

      {selectedAuthors.length ? (
        <View style={styles.selectedChipsRow}>
          {selectedAuthors.map((author) => (
            <Chip key={String(author.id)} onClose={() => onRemoveAuthor(Number(author.id))}>
              {author.name} {author.surname}
            </Chip>
          ))}
        </View>
      ) : (
        <Text variant="bodySmall" style={styles.emptyHint}>
          {t('books:search_add_authors')}
        </Text>
      )}
    </>
  );
}

export default AuthorsSection;
