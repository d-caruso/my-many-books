import * as React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Card, Text, IconButton, Menu, Chip } from 'react-native-paper';
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

export function getStatusLabel(status: Book['status']) {
  switch (status) {
    case 'reading':
      return 'Reading';
    case 'completed':
      return 'Completed';
    case 'want-to-read':
      return 'Want to Read';
    case 'paused':
      return 'Paused';
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
  const [menuVisible, setMenuVisible] = React.useState(false);

  return (
    <Card
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View details for ${book.title} by ${book.authors?.map(a => a.name).join(', ') || 'Unknown Author'}`}
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
              {book.authors?.map(a => a.name).join(', ') || 'Unknown Author'}
            </Text>
            
            {book.publishedDate && (
              <Text variant="bodySmall" style={styles.publishedDate}>
                Published: {new Date(book.publishedDate).getFullYear()}
              </Text>
            )}
            
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(book.status) }]}
              textStyle={styles.statusChipText}
              compact
              testID="book-status"
            >
              {getStatusLabel(book.status)}
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
                  title={`Mark as ${getStatusLabel(status)}`}
                />
              ))}
              <Menu.Item
                onPress={() => {
                  onDelete?.();
                  setMenuVisible(false);
                }}
                title="Delete"
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