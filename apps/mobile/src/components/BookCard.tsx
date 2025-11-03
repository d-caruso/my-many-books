import * as React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Card, Text, IconButton, Menu, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Book } from '@/types';

// Move utility functions back for direct coverage tracking
export function getStatusColor(status: Book['status']) {
  switch (status) {
    case 'reading':
      return '#2196F3';
    case 'completed':
      return '#4CAF50';
    case 'want-to-read':
      return '#FF9800';
    case 'paused':
      return '#9C27B0';
    default:
      return '#757575';
  }
}

export function getStatusLabel(status: Book['status'], t?: (key: string) => string) {
  // If t function is not provided, this shouldn't be called
  // This is kept for backward compatibility but should use t() from the component
  if (!t) {
    const statusMap: Record<Book['status'], string> = {
      'reading': 'Reading',
      'completed': 'Completed',
      'want-to-read': 'Want to Read',
      'paused': 'Paused',
    };
    return statusMap[status] || status;
  }

  switch (status) {
    case 'reading':
      return t('books:reading');
    case 'completed':
      return t('books:completed');
    case 'want-to-read':
      return t('books:want_to_read');
    case 'paused':
      return t('books:paused');
    default:
      return status;
  }
}

export const statusOptions: Book['status'][] = ['want-to-read', 'reading', 'paused', 'completed'];

interface BookCardProps {
  book: Book;
  onPress?: () => void;
  onStatusChange?: (status: Book['status']) => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onPress,
  onStatusChange,
  onDelete,
  showActions = true,
}) => {
  const { t } = useTranslation();
  const [menuVisible, setMenuVisible] = React.useState(false);

  return (
    <Card
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View details for ${book.title} by ${book.authors?.map(a => a.name).join(', ') || t('books:unknown_author')}`}
    >
      <Card.Content style={styles.content}>
        <View style={styles.bookInfo}>
          {book.thumbnail && (
            <Image source={{ uri: book.thumbnail }} style={styles.thumbnail} accessibilityLabel={`${book.title} thumbnail`} />
          )}
          
          <View style={styles.textContent}>
            <Text variant="titleMedium" style={styles.title} numberOfLines={2} testID="book-title" accessibilityRole="header">
              {book.title}
            </Text>
            
            <Text variant="bodyMedium" style={styles.author} numberOfLines={1} testID="book-author">
              {book.authors?.map(a => a.name).join(', ') || t('books:unknown_author')}
            </Text>
            
            {book.publishedDate && (
              <Text variant="bodySmall" style={styles.publishedDate}>
                {t('books:published_label', { date: new Date(book.publishedDate).getFullYear() })}
              </Text>
            )}
            
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(book.status) }]}
              textStyle={styles.statusChipText}
              compact
              testID="book-status"
            >
              {getStatusLabel(book.status, t)}
            </Chip>
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
                />
              ))}
              <Menu.Item
                onPress={() => {
                  onDelete?.();
                  setMenuVisible(false);
                }}
                title={t('delete')}
                titleStyle={{ color: '#f44336' }}
              />
            </Menu>
          </View>
        )}
      </Card.Content>
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
    backgroundColor: '#f0f0f0',
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
  statusChip: {
    alignSelf: 'flex-start',
  },
  statusChipText: {
    color: 'white',
    fontSize: 12,
  },
  actions: {
    marginLeft: 8,
  },
});