import { useState, useCallback, useEffect, useRef } from 'react';
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
import { BOOK_STATUS } from '@my-many-books/shared-types';
import type { SearchQuery } from '@/types';
import { SORT_DIRECTIONS } from '@my-many-books/shared-types';
import type { SortDirection } from '@my-many-books/shared-types';
import { DB_SORT_FIELDS } from '@/constants/db';
import type { DbSortField } from '@/constants/db';
import { SCANNER_COPY_STATUS, ScannerCopyStatus } from '@/constants/scanner';
import { authorAPI, categoryAPI } from '@/services/api';
import { authorRepository } from '@/services/database/AuthorRepository';
import { categoryRepository } from '@/services/database/CategoryRepository';
import { formatFullName, getCategoryDisplayName } from '@my-many-books/shared-utils';
import type { Author, Category } from '@my-many-books/shared-types';

type SearchMode = 'title' | 'author' | 'isbn';
type SortOption = DbSortField;
type SortOrder = SortDirection;

export default function SearchScreen() {
  const { t } = useTranslation('offline');
  const { scannedIsbn, scannerCopy } = useLocalSearchParams<{
    scannedIsbn?: string;
    scannerCopy?: ScannerCopyStatus;
  }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('title');
  const [isbnResult, setIsbnResult] = useState<Book | null>(null);
  const [statusFilter, setStatusFilter] = useState<Book['status'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>(DB_SORT_FIELDS.TITLE);
  const [sortOrder, setSortOrder] = useState<SortOrder>(SORT_DIRECTIONS.DESC);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedAuthorName, setSelectedAuthorName] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [availableAuthors, setAvailableAuthors] = useState<Author[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
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

  // Load filter options — from API online, from SQLite offline
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        if (isOffline) {
          const [localAuthors, localCats] = await Promise.all([
            authorRepository.findAll(),
            categoryRepository.findAll(),
          ]);
          setAvailableAuthors(localAuthors.map(la => la.entity));
          setAvailableCategories(localCats.map(lc => lc.entity));
        } else {
          const [authors, categories] = await Promise.all([
            authorAPI.getAuthors(),
            categoryAPI.getCategories(),
          ]);
          setAvailableAuthors(authors);
          setAvailableCategories(categories);
        }
      } catch {
        // Non-critical — filter chips stay empty, search still works
      }
    };

    void loadFilterOptions();
  }, [isOffline]);

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
      const filters: Partial<SearchQuery> = {};

      if (searchMode === 'author') {
        filters.author = searchQuery;
      }
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (selectedAuthorName) {
        filters.author = selectedAuthorName;
      }
      if (selectedCategoryName) {
        filters.category = selectedCategoryName;
      }
      filters.sortBy = sortBy;
      filters.sortOrder = sortOrder;

      await searchBooks(searchQuery, filters);
    }
  }, [searchQuery, searchMode, statusFilter, selectedAuthorName, selectedCategoryName, sortBy, sortOrder, searchBooks, searchByISBN, clearSearch]);

  useEffect(() => {
    if (!scannedIsbn) return;

    const payloadKey = `${scannedIsbn}:${scannerCopy || ''}`;
    if (handledScannerParamsRef.current === payloadKey) return;
    handledScannerParamsRef.current = payloadKey;

    const timer = setTimeout(() => {
      setSearchMode('isbn');
      setSearchQuery(scannedIsbn);

      if (scannerCopy === SCANNER_COPY_STATUS.SUCCESS || scannerCopy === SCANNER_COPY_STATUS.FAILED) {
        setFeedbackMessage(
          scannerCopy === SCANNER_COPY_STATUS.SUCCESS
            ? t('scanner:isbn_copied', { defaultValue: 'ISBN copied' })
            : t('scanner:isbn_detected', { defaultValue: 'ISBN detected' })
        );
        setFeedbackVisible(true);
      }
    }, 0);

    router.replace('/(tabs)/search');
    return () => clearTimeout(timer);
  }, [scannedIsbn, scannerCopy, t]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);
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

  const statusOptions: (Book['status'] | 'all')[] = [
    'all',
    BOOK_STATUS.READING,
    BOOK_STATUS.PAUSED,
    BOOK_STATUS.FINISHED,
  ];

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
        />

        <Searchbar
          placeholder={t('books:search_by_placeholder', { mode: searchMode.toLowerCase() })}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          accessibilityLabel="Search books by title, author, or ISBN"
        />

        {/* Status Filter */}
        <Text variant="labelMedium" style={styles.filterLabel}>
          {t('books:filter_by_status')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {statusOptions.map((status) => (
            <Chip
              key={status ?? 'none'}
              selected={statusFilter === status}
              onPress={() => setStatusFilter(status)}
              style={styles.filterChip}
              accessibilityLabel={status === 'all' ? t('books:all') : t(`books:${status}`)}
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
            selected={selectedAuthorName === null}
            onPress={() => setSelectedAuthorName(null)}
            style={styles.filterChip}
          >
            {t('books:all_authors')}
          </Chip>
          {availableAuthors.map((author) => {
            const displayName = formatFullName(author.name, author.surname);
            return (
              <Chip
                key={author.id}
                selected={selectedAuthorName === displayName}
                onPress={() => setSelectedAuthorName(
                  selectedAuthorName === displayName ? null : displayName
                )}
                style={styles.filterChip}
              >
                {displayName}
              </Chip>
            );
          })}
        </ScrollView>

        {/* Category Filter */}
        <Text variant="labelMedium" style={styles.filterLabel}>
          {t('books:filter_by_category')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <Chip
            selected={selectedCategoryName === null}
            onPress={() => setSelectedCategoryName(null)}
            style={styles.filterChip}
          >
            {t('books:all_categories')}
          </Chip>
          {availableCategories.map((cat) => (
            <Chip
              key={cat.id}
              selected={selectedCategoryName === cat.name}
              onPress={() => setSelectedCategoryName(
                selectedCategoryName === cat.name ? null : cat.name
              )}
              style={styles.filterChip}
            >
              {getCategoryDisplayName(cat, t)}
            </Chip>
          ))}
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
                {t(`books:sort_${sortBy}`)} ({sortOrder === SORT_DIRECTIONS.ASC ? '↑' : '↓'})
              </Button>
            }
          >
            {(Object.values(DB_SORT_FIELDS) as SortOption[]).map((option) => (
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
            icon={sortOrder === SORT_DIRECTIONS.ASC ? 'arrow-up' : 'arrow-down'}
            onPress={() => setSortOrder(sortOrder === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC)}
            accessibilityLabel={`Sort ${sortOrder === SORT_DIRECTIONS.ASC ? 'descending' : 'ascending'}`}
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
              icon="search"
              title={t('books:no_books_found')}
              description={t('books:try_different_search')}
            />
          ) : !loading ? (
            <EmptyState
              icon="search"
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
