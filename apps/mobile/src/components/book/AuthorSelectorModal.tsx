import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Dialog, List, Portal, Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Author } from '@my-many-books/shared-types';

interface AuthorSelectorModalProps {
  visible: boolean;
  authors: Author[];
  selectedAuthorIds: number[];
  loading?: boolean;
  onClose: () => void;
  onSelectAuthor: (author: Author) => void;
  onAddAuthorPress: () => void;
}

export function AuthorSelectorModal({
  visible,
  authors,
  selectedAuthorIds,
  loading = false,
  onClose,
  onSelectAuthor,
  onAddAuthorPress,
}: AuthorSelectorModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) {
      setSearch('');
    }
  }, [visible]);

  const filteredAuthors = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return authors;
    }

    return authors.filter((author) => {
      const full = `${author.name} ${author.surname}`.toLowerCase();
      const reverse = `${author.surname} ${author.name}`.toLowerCase();
      return full.includes(term) || reverse.includes(term);
    });
  }, [authors, search]);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose}>
        <Dialog.Title>{t('books:select_author')}</Dialog.Title>
        <Dialog.Content>
          <View style={styles.content}>
            <TextInput
              label={t('books:author')}
              value={search}
              onChangeText={setSearch}
              placeholder={t('books:search_by_author_placeholder')}
              autoCapitalize="words"
            />

            <View style={styles.actionRow}>
              <Button mode="outlined" onPress={onAddAuthorPress}>
                {t('books:add_author')}
              </Button>
              <Text variant="bodySmall" style={styles.helperText}>
                {loading ? t('books:loading_categories') : t('books:search_add_authors')}
              </Text>
            </View>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {filteredAuthors.map((author) => {
                const isSelected = selectedAuthorIds.includes(Number(author.id));
                return (
                  <List.Item
                    key={String(author.id)}
                    title={`${author.name} ${author.surname}`}
                    description={author.nationality || undefined}
                    onPress={() => {
                      onSelectAuthor(author);
                      onClose();
                    }}
                    right={() =>
                      isSelected ? <Chip compact>{t('common:selected', { defaultValue: 'Selected' })}</Chip> : null
                    }
                  />
                );
              })}

              {!filteredAuthors.length && (
                <Text variant="bodySmall" style={styles.emptyText}>
                  {search.trim()
                    ? t('books:no_authors_found', { term: search })
                    : t('books:type_to_search_authors')}
                </Text>
              )}
            </ScrollView>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose}>{t('common:close', { defaultValue: 'Close' })}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  actionRow: {
    gap: 8,
  },
  helperText: {
    color: '#64748b',
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    paddingVertical: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    paddingVertical: 16,
  },
});

export default AuthorSelectorModal;
