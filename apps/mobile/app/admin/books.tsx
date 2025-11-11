import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, Searchbar, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { adminAPI } from '@/services/api';

interface Book {
  id: number;
  title: string;
  isbnCode: string;
  status?: 'reading' | 'paused' | 'finished' | null;
  userName?: string | null;
  authors: Array<{ fullName: string }>;
  createdAt: string;
}

export default function BookManagement() {
  const { t } = useTranslation();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAdminBooks(page, 50, searchQuery || undefined);
      setBooks(response.books);
    } catch (err: any) {
      console.error('Failed to fetch books:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          accessibilityLabel={t('accessibility:loading_books', 'Loading books...')}
        />
      </View>
    );
  }

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'reading':
        return '#2196f3';
      case 'paused':
        return '#ff9800';
      case 'finished':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder={t('pages:admin.books.search_placeholder', 'Search by title, ISBN, or author...')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        accessibilityLabel={t('accessibility:search_books_label', 'Search books')}
        accessibilityHint={t('accessibility:search_books_hint', 'Search for books by title, ISBN, or author name')}
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {books.length === 0 ? (
          <Text
            style={styles.emptyText}
            accessible={true}
            accessibilityRole="text"
          >
            {t('pages:admin.books.no_books', 'No books found')}
          </Text>
        ) : (
          books.map((book) => {
            const authors = book.authors.map((a) => a.fullName).join(', ');
            const status = book.status || 'N/A';
            const owner = book.userName || t('pages:admin.books.no_owner', 'No owner');
            return (
              <Card
                key={book.id}
                style={styles.bookCard}
                accessible={true}
                accessibilityLabel={t('accessibility:book_card_label', '{{title}}, ISBN {{isbn}}{{authors}}, status: {{status}}, owner: {{owner}}', {
                  title: book.title,
                  isbn: book.isbnCode,
                  authors: authors ? `, by ${authors}` : '',
                  status: status,
                  owner: owner
                })}
                accessibilityRole="summary"
              >
                <Card.Content>
                  <Text variant="titleMedium">{book.title}</Text>
                  <Text variant="bodySmall" style={styles.isbn}>
                    ISBN: {book.isbnCode}
                  </Text>
                  {book.authors.length > 0 && (
                    <Text variant="bodySmall">
                      {authors}
                    </Text>
                  )}
                  <View style={styles.bookFooter}>
                    <Chip
                      mode="flat"
                      style={{ backgroundColor: getStatusColor(book.status) }}
                      accessible={true}
                      accessibilityLabel={t('accessibility:book_status', 'Status: {{status}}', { status: status })}
                    >
                      {status}
                    </Chip>
                    <Text variant="bodySmall">
                      {owner}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    marginBottom: 16,
  },
  bookCard: {
    marginBottom: 12,
  },
  isbn: {
    color: '#666',
    marginTop: 4,
  },
  bookFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
    color: '#666',
  },
});
