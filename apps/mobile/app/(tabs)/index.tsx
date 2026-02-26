import { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { FAB, Searchbar, Chip, Text, Snackbar } from 'react-native-paper';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@my-many-books/shared-auth';
import { POST_LOGIN_WELCOME_STORAGE_KEY } from '@my-many-books/shared-types';

import { BookCard } from '@/components/BookCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useBooks } from '@/hooks/useBooks';
import { useBookSearch } from '@/hooks/useBookSearch';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { useNetworkState } from '@/hooks/useNetworkState';
import { Book } from '@/types';

export default function BooksScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const { isOnline } = useNetworkState();
  
  const {
    books: userBooks,
    loading: userBooksLoading,
    error: userBooksError,
    refreshing,
    refreshBooks,
    updateBookStatus,
    deleteBook,
    resolveConflict,
  } = useBooks();

  const {
    books: searchResults,
    loading: searchLoading,
    error: searchError,
    searchBooks,
    clearSearch,
  } = useBookSearch();

  const { performFullSync } = useSyncQueue();

  const books = isSearching ? searchResults : userBooks;
  const loading = isSearching ? searchLoading : userBooksLoading;
  const error = isSearching ? searchError : userBooksError;

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const maybeShowWelcome = async () => {
      try {
        const shouldShow = (await AsyncStorage.getItem(POST_LOGIN_WELCOME_STORAGE_KEY)) === '1';
        if (!shouldShow || cancelled) return;

        await AsyncStorage.removeItem(POST_LOGIN_WELCOME_STORAGE_KEY);
        if (cancelled) return;

        const displayName = user.name?.trim() || user.email || t('common:user', 'User');

        setWelcomeMessage(
          t('common:welcome_user', {
            name: displayName,
            defaultValue: 'Hello {{name}}',
          })
        );
        setWelcomeVisible(true);
      } catch {
        // Non-blocking UI enhancement
      }
    };

    void maybeShowWelcome();

    return () => {
      cancelled = true;
    };
  }, [user, t]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearching(true);
      await searchBooks(query);
    } else {
      setIsSearching(false);
      clearSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    clearSearch();
  };

  const handleBookPress = (book: Book) => {
    router.push(`/book/${book.id}`);
  };

  const handleStatusChange = async (bookId: number, status: Book['status']) => {
    try {
      await updateBookStatus(bookId, status);
    } catch (error) {
      console.error('Failed to update book status:', error);
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    try {
      await deleteBook(bookId);
    } catch (error) {
      console.error('Failed to delete book:', error);
    }
  };

  const handleResolveConflict = async (bookId: number, choice: 'local' | 'server') => {
    try {
      await resolveConflict(bookId, choice);
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const renderBook = ({ item }: { item: Book }) => (
    <BookCard
      book={item}
      onPress={() => handleBookPress(item)}
      onStatusChange={(status) => handleStatusChange(item.id, status)}
      onDelete={() => handleDeleteBook(item.id)}
      onResolveConflict={(choice) => handleResolveConflict(item.id, choice)}
    />
  );

  if (loading && books.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title} accessibilityRole="header">
          {t('books:my_books')}
        </Text>
        <Searchbar
          placeholder={t('books:search_books_placeholder')}
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
          accessibilityLabel="Search books"
        />
        {isSearching && (
          <View style={styles.chipContainer}>
            <Chip
              icon="close"
              onPress={handleClearSearch}
              style={styles.chip}
              accessibilityLabel="Clear search results"
            >
              {t('books:clear_search')}
            </Chip>
          </View>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text variant="bodyMedium" style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      <FlatList
        data={books}
        renderItem={renderBook}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              await performFullSync();
              await refreshBooks();
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="book"
            title={isSearching ? t('books:no_books_found') : t('books:no_books_yet')}
            description={
              isSearching
                ? t('books:try_different_search')
                : t('books:add_your_first_book')
            }
            actionText={isSearching ? undefined : t('books:add_book')}
            onAction={isSearching ? undefined : () => router.push('/book/add')}
          />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          router.push('/book/add');
        }}
        accessibilityLabel={t('books:add_book')}
        accessibilityHint={!isOnline ? t('tooltips.willSyncLater', { ns: 'offline' }) : undefined}
      />

      <Snackbar
        visible={welcomeVisible}
        onDismiss={() => setWelcomeVisible(false)}
        duration={3000}
        action={{
          label: t('ok'),
          onPress: () => setWelcomeVisible(false),
        }}
      >
        {welcomeMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  searchbar: {
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  chip: {
    marginRight: 8,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  fabDisabled: {
    opacity: 0.5,
  },
});
