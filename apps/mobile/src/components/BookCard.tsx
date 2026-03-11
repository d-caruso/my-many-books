import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, Menu, Chip, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Book } from '@/types';
import type { EntityMeta, UiBook } from '@/types/ui';
import { useNetworkState } from '@/hooks/useNetworkState';
import { SyncStatusBadge } from './SyncStatusBadge';
import { ConflictDialog } from './ConflictDialog';
import { BOOK_STATUS } from '@my-many-books/shared-types';
import { getStatusColor } from '@my-many-books/shared-design';

export function getStatusLabel(status: Book['status'], t?: (key: string) => string) {
  // If t function is not provided, this shouldn't be called
  // This is kept for backward compatibility but should use t() from the component
  if (!t) {
    const statusMap: Record<Book['status'], string> = {
      [BOOK_STATUS.READING]: BOOK_STATUS.READING,
      [BOOK_STATUS.FINISHED]: BOOK_STATUS.FINISHED,
      [BOOK_STATUS.PAUSED]: BOOK_STATUS.PAUSED,
    };
    return statusMap[status] || status;
  }

  switch (status) {
    case BOOK_STATUS.READING:
      return t('books:reading');
    case BOOK_STATUS.FINISHED:
      return t('books:completed');
    case BOOK_STATUS.PAUSED:
      return t('books:paused');
    default:
      return status;
  }
}

export const statusOptions: Book['status'][] = [BOOK_STATUS.READING, BOOK_STATUS.PAUSED, BOOK_STATUS.FINISHED];

interface BookCardProps {
  book: UiBook | (Book & { meta?: EntityMeta });
  onPress?: () => void;
  onStatusChange?: (status: Book['status']) => void;
  onDelete?: () => void;
  onResolveConflict?: (id: number | string, choice: 'local' | 'server') => void;
  showActions?: boolean;
  containerStyle?: object;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onPress,
  onStatusChange,
  onDelete,
  onResolveConflict,
  showActions = true,
  containerStyle,
}) => {
  const { t } = useTranslation('offline');
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [conflictDialogVisible, setConflictDialogVisible] = React.useState(false);
  const { isOnline } = useNetworkState();

  return (
    <Card
      style={[styles.card, containerStyle]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View details for ${book.title} by ${book.authors?.map(a => a.name).join(', ') || t('books:unknown_author')}`}
    >
      <Card.Content style={styles.content}>
        <View style={styles.bookInfo}>
          {/*{book.thumbnail && (
            <Image source={{ uri: book.thumbnail }} style={styles.thumbnail} accessibilityLabel={`${book.title} thumbnail`} />
          )}*/}
          
          <View style={styles.textContent}>
            <Text variant="titleMedium" style={styles.title} numberOfLines={2} testID="book-title" accessibilityRole="header">
              {book.title}
            </Text>
            
            <Text variant="bodyMedium" style={styles.author} numberOfLines={1} testID="book-author">
              {book.authors?.map(a => a.name).join(', ') || t('books:unknown_author')}
            </Text>
            
            {/*{book.publishedDate && (
              <Text variant="bodySmall" style={styles.publishedDate}>
                {t('books:published_label', { date: new Date(book.publishedDate).getFullYear() })}
              </Text>
            )}*/}
            
            <View style={styles.chipRow}>
              <Chip
                style={[styles.statusChip, { backgroundColor: getStatusColor(book.status) }]}
                textStyle={styles.statusChipText}
                compact
                testID="book-status"
              >
                {getStatusLabel(book.status, t)}
              </Chip>
              <SyncStatusBadge
                syncStatus={book.meta?.syncStatus}
                compact
              />
              {book.meta?.hasConflict && (
                <Chip
                  icon="alert"
                  style={styles.conflictChip}
                  textStyle={styles.conflictChipText}
                  compact
                  onPress={() => setConflictDialogVisible(true)}
                  testID="conflict-chip"
                >
                  {t('conflicts.conflict')}
                </Chip>
              )}
            </View>
          </View>
        </View>

        {showActions && (
          <View style={styles.actions} testID="book-actions">
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  onPress={() => setMenuVisible(true)}
                  testID="book-menu-button"
                  accessibilityLabel={`More options for ${book.title}`}
                />
              }
            >
              {statusOptions.map((status) => (
                <Menu.Item
                  key={status}
                  onPress={() => {
                    onStatusChange?.(status);
                    setMenuVisible(false);
                  }}
                  title={t('books:mark_as_status', { status: getStatusLabel(status, t) })}
                  titleStyle={!isOnline ? { color: theme.colors.secondary } : undefined}
                />
              ))}
              {onDelete && (
                <Menu.Item
                  onPress={() => {
                    onDelete();
                    setMenuVisible(false);
                  }}
                  title={t('delete')}
                  titleStyle={{ color: !isOnline ? theme.colors.secondary : theme.colors.error }}
                />
              )}
            </Menu>
          </View>
        )}
      </Card.Content>

      {book.meta?.hasConflict && (
        <ConflictDialog
          visible={conflictDialogVisible}
          localBook={book}
          serverBook={(book as UiBook & { _serverVersion?: Book })._serverVersion ?? book}
          onResolve={(choice) => {
            onResolveConflict?.(book.id, choice);
            setConflictDialogVisible(false);
          }}
          onDismiss={() => setConflictDialogVisible(false)}
        />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bookInfo: {
    flex: 1,
    flexDirection: 'row',
  },
  thumbnail: {
    width: 60,
    height: 80,
    borderRadius: 4,
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  author: {
    opacity: 0.7,
    marginBottom: 4,
  },
  publishedDate: {
    opacity: 0.6,
    fontSize: 12,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  statusChipText: {
    color: 'white',
    fontSize: 12,
  },
  conflictChip: {
    alignSelf: 'flex-start',
  },
  conflictChipText: {
    color: 'white',
    fontSize: 10,
  },
  actions: {
    marginLeft: 8,
  },
});
