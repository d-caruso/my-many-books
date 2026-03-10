import { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Chip,
  Button,
  Divider,
  Surface,
  Menu,
  Dialog,
  Portal,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BOOK_STATUS } from '@my-many-books/shared-types';
import { formatBookCardData, getCategoryDisplayName } from '@my-many-books/shared-utils';
import { getStatusColor } from '@my-many-books/shared-design';
import { useBooks } from '@/hooks/useBooks';
import type { Book } from '@/types';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation(['books', 'common']);
  const { books, loading, updateBookStatus, deleteBook } = useBooks();

  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const book = books.find(b => String(b.id) === id);
  const cardData = book ? formatBookCardData(book) : null;

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const handleStatusChange = async (status: Book['status']) => {
    if (!book) return;
    setStatusMenuVisible(false);
    setActionLoading(true);
    try {
      await updateBookStatus(book.id, status);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!book) return;
    setDeleteDialogVisible(false);
    setActionLoading(true);
    try {
      await deleteBook(book.id);
      router.back();
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !book) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text variant="bodyLarge">{t('books:book_not_found', 'Book not found')}</Text>
        <Button onPress={() => router.back()} style={styles.backButton}>
          {t('common:back')}
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Surface style={styles.surface} elevation={1}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerActions}>
              <IconButton
                icon="pencil"
                disabled={actionLoading}
                onPress={() => router.push(`/book/edit/${id}`)}
                accessibilityLabel={t('books:edit_book')}
              />
              <IconButton
                icon="delete"
                iconColor="#b00020"
                disabled={actionLoading}
                onPress={() => setDeleteDialogVisible(true)}
                accessibilityLabel={t('books:delete_book_title')}
              />
            </View>
          </View>

          {/* Title & Authors */}
          <View style={styles.section}>
            <Text variant="headlineSmall" style={styles.title}>
              {cardData!.title}
            </Text>
            <Text variant="bodyMedium" style={styles.authors}>
              {cardData!.authors}
            </Text>
          </View>

          {/* Status */}
          <View style={styles.section}>
            <Text variant="labelSmall" style={styles.fieldLabel}>
              {t('books:update_reading_status')}
            </Text>
            <Menu
              visible={statusMenuVisible}
              onDismiss={() => setStatusMenuVisible(false)}
              anchor={
                <Chip
                  onPress={() => setStatusMenuVisible(true)}
                  style={[styles.statusChip, { backgroundColor: getStatusColor(book.status ?? undefined) }]}
                  textStyle={styles.statusChipText}
                  icon="chevron-down"
                  disabled={actionLoading}
                >
                  {book.status ? t(`books:${book.status}`) : t('books:no_status', 'No status')}
                </Chip>
              }
            >
              <Menu.Item
                onPress={() => handleStatusChange(BOOK_STATUS.READING)}
                title={t('books:reading')}
              />
              <Menu.Item
                onPress={() => handleStatusChange(BOOK_STATUS.PAUSED)}
                title={t('books:paused')}
              />
              <Menu.Item
                onPress={() => handleStatusChange(BOOK_STATUS.FINISHED)}
                title={t('books:finished')}
              />
            </Menu>
          </View>

          <Divider style={styles.divider} />

          {/* Metadata fields */}
          <View style={styles.section}>
            {cardData!.isbn && <Field label={t('books:isbn')} value={cardData!.isbn} />}
            {cardData!.editionInfo && (
              <Field label={t('books:edition')} value={cardData!.editionInfo} />
            )}
            {formatDate(book.creationDate) && (
              <Field label={t('books:added')} value={formatDate(book.creationDate)!} />
            )}
            {book.updateDate && book.updateDate !== book.creationDate && (
              <Field label={t('books:last_updated')} value={formatDate(book.updateDate)!} />
            )}
          </View>

          {/* Categories */}
          {book.categories?.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.section}>
                <Text variant="labelSmall" style={styles.fieldLabel}>
                  {t('books:categories')}
                </Text>
                <View style={styles.chipRow}>
                  {book.categories.map(cat => (
                    <Chip key={cat.id} style={styles.categoryChip}>
                      {getCategoryDisplayName(cat, t)}
                    </Chip>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Notes */}
          {book.notes ? (
            <>
              <Divider style={styles.divider} />
              <View style={styles.section}>
                <Text variant="labelSmall" style={styles.fieldLabel}>
                  {t('books:notes')}
                </Text>
                <Text variant="bodyMedium" style={styles.notes}>
                  {book.notes}
                </Text>
              </View>
            </>
          ) : null}

        </Surface>
      </ScrollView>

      {/* Delete confirmation */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>{t('books:delete_book')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {t('books:delete_confirm', { title: cardData!.title })}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>
              {t('common:cancel')}
            </Button>
            <Button
              textColor="#b00020"
              loading={actionLoading}
              disabled={actionLoading}
              onPress={handleDelete}
            >
              {actionLoading ? t('books:deleting') : t('books:delete_book')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text variant="labelSmall" style={styles.fieldLabel}>{label}</Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    padding: 16,
  },
  surface: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  title: {
    fontWeight: '700',
  },
  authors: {
    opacity: 0.7,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  statusChipText: {
    color: '#ffffff',
  },
  divider: {
    marginHorizontal: 16,
  },
  field: {
    gap: 2,
  },
  fieldLabel: {
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    alignSelf: 'flex-start',
  },
  notes: {
    lineHeight: 22,
  },
  backButton: {
    marginTop: 12,
  },
});
