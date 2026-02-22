import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, ScrollView } from 'react-native';
import { Searchbar, Text, SegmentedButtons, Chip, Menu, Button, IconButton, Snackbar } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';

import { BookCard } from '@/components/BookCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useBookSearch } from '@/hooks/useBookSearch';
import { Book } from '@my-many-books/shared-types';

type SearchMode = 'title' | 'author' | 'isbn';
type SortOption = 'title' | 'author' | 'date_added' | 'date_updated';
type SortDirection = 'asc' | 'desc';

export default function SearchScreen() {
  const { t } = useTranslation('offline');
  const { scannedIsbn, scannerCopy } = useLocalSearchParams<{
    scannedIsbn?: string;
    scannerCopy?: 'success' | 'failed';
  }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('title');
  const [isbnResult, setIsbnResult] = useState<Book | null>(null);
  const [statusFilter, setStatusFilter] = useState<Book['status'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const handledScannerParamsRef = useRef<string | null>(null);

  const {
    books,
    loading,
    error,
    isOffline,
    searchBooks,
    searchByISBN,
    clearSearch,
  } = useBookSearch();

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setIsbnResult(null);
      clearSearch();
      return;
    }

    if (searchMode === 'isbn') {
      const book = await searchByISBN(searchQuery);
      setIsbnResult(book);
    } else {
      setIsbnResult(null);
      const filters: {
        author?: string;
        status?: string;
        category?: string;
        query?: string;
      } = {};
      
      // Apply search mode filter
      if (searchMode === 'author') {
        filters.author = searchQuery;
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      
      // Apply author filter
      if (selectedAuthor) {
        filters.author = selectedAuthor;
      }
      
      // Apply category filter
      if (selectedCategory) {
        filters.category = selectedCategory;
      }
      
      // Apply sort options
      filters.sortBy = sortBy;
      filters.sortDirection = sortDirection;
      
      await searchBooks(searchQuery, filters);
    }
  }, [searchQuery, searchMode, statusFilter, selectedAuthor, selectedCategory, sortBy, sortDirection, searchBooks, searchByISBN, clearSearch]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
  };

  useEffect(() => {
    if (!scannedIsbn) {
      return;
    }

    const payloadKey = `${scannedIsbn}:${scannerCopy || ''}`;
    if (handledScannerParamsRef.current === payloadKey) {
      return;
    }
    handledScannerParamsRef.current = payloadKey;

    setSearchMode('isbn');
    setSearchQuery(scannedIsbn);

    if (scannerCopy === 'success' || scannerCopy === 'failed') {
      setFeedbackMessage(
        scannerCopy === 'success'
          ? t('scanner:isbn_copied', { defaultValue: 'ISBN copied' })
          : t('scanner:isbn_detected', { defaultValue: 'ISBN detected' })
      );
      setFeedbackVisible(true);
    }

    router.replace('/(tabs)/search');
  }, [scannedIsbn, scannerCopy, t]);

  // Trigger search when filters change
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    }
  }, [statusFilter, selectedAuthor, selectedCategory, sortBy, sortDirection, performSearch]);

  // Trigger search when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  const renderBook = ({ item }: { item: Book }) => (
    <BookCard
      book={item}
      onPress={() => {}}
      showActions={false}
    />
  );

  const displayedBooks =
    searchMode === 'isbn' && searchQuery.trim()
      ? (isbnResult ? [isbnResult] : [])
      : books;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title} accessibilityRole="header">
          {t('books:search_books')}
        </Text>

        <SegmentedButtons
          value={searchMode}
          onValueChange={(value) => setSearchMode(value as SearchMode)}
          buttons={[
            { value: 'title', label: t('books:search_by_title_tab') },
            { value: 'author', label: t('books:search_by_author_tab') },
            { value: 'isbn', label: t('books:search_by_isbn_tab') },
          ]}
          style={styles.segmentedButtons}
          accessibilityLabel="Select search type"
        />

        <Searchbar
          placeholder={t('books:search_by_placeholder', { mode: searchMode.toLowerCase() })}
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
          accessibilityLabel="Search books by title, author, or ISBN"
        />

        {/* Status Filter */}
        <Text variant="labelMedium" style={styles.filterLabel}>
          {t('books:filter_by_status')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['all', 'want-to-read', 'reading', 'paused', 'completed'].map((status) => (
            <Chip
              key={status}
              selected={statusFilter === status}
              onPress={() => setStatusFilter(status as Book['status'] | 'all')}
              style={styles.filterChip}
              accessibilityLabel={`Filter by ${status === 'all' ? 'all books' : t(`books:${status}`)}`}
            >
              {status === 'all' ? t('books:all') : t(`books:${status}`)}
            </Chip>
          ))}
        </ScrollView>

        {/* Author Filter */}
        <Text variant="labelMedium" style={styles.filterLabel}>
          {t('books:filter_by_author')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <Chip
            selected={selectedAuthor === null}
            onPress={() => setSelectedAuthor(null)}
            style={styles.filterChip}
          >
            {t('books:all_authors')}
          </Chip>
          {/* Note: In a real implementation, you'd fetch available authors from the database */}
        </ScrollView>

        {/* Category Filter */}
        <Text variant="labelMedium" style={styles.filterLabel}>
          {t('books:filter_by_category')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <Chip
            selected={selectedCategory === null}
            onPress={() => setSelectedCategory(null)}
            style={styles.filterChip}
          >
            {t('books:all_categories')}
          </Chip>
          {/* Note: In a real implementation, you'd fetch available categories from the database */}
        </ScrollView>

        {/* Sort Controls */}
        <View style={styles.sortContainer}>
          <Text variant="labelMedium" style={styles.sortLabel}>
            {t('books:sort_by')}
          </Text>
          <Menu
            visible={showSortMenu}
            onDismiss={() => setShowSortMenu(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setShowSortMenu(true)}
                contentStyle={styles.sortButtonContent}
                style={styles.sortButton}
              >
                {t(`books:sort_${sortBy}`)} ({sortDirection === 'asc' ? '↑' : '↓'})
              </Button>
            }
          >
            {(['title', 'author', 'date_added', 'date_updated'] as SortOption[]).map((option) => (
              <Menu.Item
                key={option}
                onPress={() => {
                  setSortBy(option);
                  setShowSortMenu(false);
                }}
                title={t(`books:sort_${option}`)}
                titleStyle={sortBy === option ? { fontWeight: 'bold' } : undefined}
              />
            ))}
          </Menu>
          <IconButton
            icon={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
            onPress={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            accessibilityLabel={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
          />
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text variant="bodyMedium" style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      {isOffline && (
        <View style={styles.offlineContainer}>
          <Text variant="bodyMedium" style={styles.offlineText}>
            {t('search.indicator')}
          </Text>
        </View>
      )}

      {loading && displayedBooks.length === 0 && <LoadingSpinner />}

      <FlatList
        data={displayedBooks}
        renderItem={renderBook}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !loading && searchQuery.trim() ? (
            <EmptyState
              icon="magnify"
              title={t('books:no_books_found')}
              description={t('books:try_different_search')}
            />
          ) : !loading ? (
            <EmptyState
              icon="magnify"
              title={t('books:start_searching')}
              description={t('books:enter_title_author_isbn_to_begin')}
            />
          ) : null
        }
      />

      <Snackbar
        visible={feedbackVisible}
        onDismiss={() => setFeedbackVisible(false)}
        duration={3000}
      >
        {feedbackMessage}
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
  segmentedButtons: {
    marginBottom: 16,
  },
  searchbar: {
    marginBottom: 8,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  offlineContainer: {
    padding: 12,
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  offlineText: {
    color: '#856404',
    textAlign: 'center',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  filterLabel: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterChip: {
    marginRight: 8,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sortLabel: {
    marginRight: 12,
    fontWeight: '500',
  },
  sortButton: {
    flex: 1,
    marginRight: 8,
  },
  sortButtonContent: {
    paddingHorizontal: 8,
  },
});
