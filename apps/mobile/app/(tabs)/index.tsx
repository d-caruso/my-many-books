import { useEffect, useState, useMemo } from 'react';
import { View, FlatList, RefreshControl, useWindowDimensions } from 'react-native';
import { FAB, Searchbar, Chip, Text, Snackbar, useTheme } from 'react-native-paper';
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
import type { UiBook } from '@/types/ui';
import type { ListRenderItem } from 'react-native';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';

function getNumColumns(width: number): number {
  if (width >= 900) return 3;
  if (width >= 600) return 2;
  return 1;
}

export default function BooksScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const numColumns = getNumColumns(width);
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

  const handleBookPress = (book: UiBook) => {
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

  const renderBook: ListRenderItem<UiBook> = ({ item }) => (
    <BookCard
      book={item}
      onPress={() => handleBookPress(item)}
      onStatusChange={(status) => handleStatusChange(item.id, status)}
      onDelete={() => handleDeleteBook(item.id)}
      onResolveConflict={(id, choice) => handleResolveConflict(Number(id), choice)}
      containerStyle={numColumns > 1 ? styles.gridItem : undefined}
    />
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        header: {
          padding: 16,
          backgroundColor: theme.colors.surface,
          elevation: 2,
          shadowColor: theme.colors.shadow,
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
          backgroundColor: theme.colors.errorContainer,
        },
        errorText: {
          color: theme.colors.error,
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
        gridItem: {
          flex: 1,
          margin: 6,
        },
      }),
    [theme]
  );

  if (loading && books.length === 0) {
    return <LoadingSpinner />;
  }

  const renderList = () => (
    <>
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
        key={numColumns}
        data={books}
        renderItem={renderBook}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
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
    </>
  );

  return (
    <PageErrorBoundary>
    <SafeAreaView style={styles.container}>
      {renderList()}
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
    </PageErrorBoundary>
  );
}
