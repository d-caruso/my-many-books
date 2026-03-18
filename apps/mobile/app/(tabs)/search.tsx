import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, FlatList, ScrollView } from 'react-native';
import { Searchbar, Text, Chip, Menu, Button, IconButton, Snackbar, useTheme } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';

import { BookCard } from '@/components/BookCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useBookSearch } from '@/hooks/useBookSearch';
import { useBooks } from '@/hooks/useBooks';
import { Book } from '@my-many-books/shared-types';
import { BOOK_STATUS } from '@my-many-books/shared-types';
import type { SearchQuery } from '@/types';
import {
  SEARCH_QUERY_MIN_LENGTH,
  SEARCH_SORT_BY_FIELDS,
  SORT_DIRECTIONS,
  type SearchSortByField,
  type SortDirection,
} from '@my-many-books/shared-types';
import { SCANNER_COPY_STATUS, ScannerCopyStatus } from '@/constants/scanner';
import { authorAPI, categoryAPI } from '@/services/api';
import { authorRepository } from '@/services/database/AuthorRepository';
import { categoryRepository } from '@/services/database/CategoryRepository';
import { formatFullName, getCategoryDisplayName } from '@my-many-books/shared-utils';
import type { Author, Category } from '@my-many-books/shared-types';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';
import { AuthorSelectorModal } from '@/components/book/AuthorSelectorModal';
import { CategorySelectorModal } from '@/components/book/CategorySelectorModal';
import { mobileHooks, MOBILE_EVENTS } from '@/services/hooks/mobileHooks';

type SortOption = SearchSortByField;
type SortOrder = SortDirection;

const SORT_OPTIONS: readonly SortOption[] = [
  SEARCH_SORT_BY_FIELDS.TITLE,
  SEARCH_SORT_BY_FIELDS.AUTHOR,
  SEARCH_SORT_BY_FIELDS.STATUS,
  SEARCH_SORT_BY_FIELDS.CREATION_DATE,
  SEARCH_SORT_BY_FIELDS.UPDATE_DATE,
];

export default function SearchScreen() {
  const { t } = useTranslation(['offline', 'common', 'accessibility']);
  const theme = useTheme();
  const { isbn, scannerCopy } = useLocalSearchParams<{
    isbn?: string;
    scannerCopy?: ScannerCopyStatus;
  }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isbnResult, setIsbnResult] = useState<Book | null>(null);
  const [isbnNotFound, setIsbnNotFound] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Book['status'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>(SEARCH_SORT_BY_FIELDS.TITLE);
  const [sortOrder, setSortOrder] = useState<SortOrder>(SORT_DIRECTIONS.ASC);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [availableAuthors, setAvailableAuthors] = useState<Author[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [authorSelectorVisible, setAuthorSelectorVisible] = useState(false);
  const [categorySelectorVisible, setCategorySelectorVisible] = useState(false);
  const handledScannerParamsRef = useRef<string | null>(null);

  const {
    books,
    loading,
    error,
    hasMore,
    isOffline,
    searchBooks,
    searchByISBN,
    clearSearch,
    loadMore,
  } = useBookSearch();

  const { updateBookStatus } = useBooks();

  const handleStatusChange = useCallback(async (bookId: number, status: Book['status']) => {
    try {
      await updateBookStatus(bookId, status);
    } catch {
      setFeedbackMessage(t('books:status_update_failed', { defaultValue: 'Failed to update status' }));
      setFeedbackVisible(true);
    }
  }, [updateBookStatus, t]);

  const hasActiveFilters =
    statusFilter !== 'all' || selectedAuthorId !== null || selectedCategoryId !== null;
  const selectedAuthor = selectedAuthorId === null
    ? null
    : availableAuthors.find((author) => Number(author.id) === selectedAuthorId) ?? null;
  const selectedCategory = selectedCategoryId === null
    ? null
    : availableCategories.find((category) => Number(category.id) === selectedCategoryId) ?? null;

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
    const trimmedQuery = searchQuery.trim();
    const hasValidQuery = trimmedQuery.length >= SEARCH_QUERY_MIN_LENGTH;

    if (!hasValidQuery && !hasActiveFilters) {
      setFeedbackMessage(t('books:search_min_chars'));
      setFeedbackVisible(true);
      return;
    }

    setIsbnResult(null);
    setIsbnNotFound(false);
    const filters: Partial<SearchQuery> = {};

    if (statusFilter !== 'all') {
      filters.status = statusFilter;
    }
    if (selectedAuthorId !== null) {
      filters.authorId = selectedAuthorId;
    }
    if (selectedCategoryId !== null) {
      filters.categoryId = selectedCategoryId;
    }
    filters.sortBy = sortBy;
    filters.sortOrder = sortOrder;

    await searchBooks(trimmedQuery, filters);
  }, [
    hasActiveFilters,
    searchBooks,
    searchQuery,
    selectedAuthorId,
    selectedCategoryId,
    sortBy,
    sortOrder,
    statusFilter,
    t,
  ]);

  useEffect(() => {
    if (!isbn) return;

    const payloadKey = `${isbn}:${scannerCopy || ''}`;
    if (handledScannerParamsRef.current === payloadKey) return;
    handledScannerParamsRef.current = payloadKey;

    const timer = setTimeout(() => {
      searchByISBN(isbn).then((result) => {
        setIsbnResult(result);
        setIsbnNotFound(result === null);
        setSearchQuery('');
        clearSearch();
      });

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
  }, [isbn, scannerCopy, searchByISBN, clearSearch, t]);

  const handleSubmit = useCallback(() => {
    void performSearch();
  }, [performSearch]);

  const handleBookPress = useCallback((book: Book) => {
    mobileHooks.emit(MOBILE_EVENTS.SEARCH.RESULT_SELECTED, {
      bookId: book.id,
      title: book.title,
      query: searchQuery.trim(),
      source: 'search_screen',
      selectionContext: isbn ? 'isbn' : 'query',
    });
    router.push(`/book/${book.id}`);
  }, [isbn, searchQuery]);

  const renderBook = ({ item }: { item: Book }) => (
    <BookCard
      book={item}
      onPress={() => handleBookPress(item)}
      onStatusChange={(status) => void handleStatusChange(Number(item.id), status)}
    />
  );

  const displayedBooks = isbnResult ? [isbnResult] : books;

  const statusOptions: (Book['status'] | 'all')[] = [
    'all',
    BOOK_STATUS.READING,
    BOOK_STATUS.PAUSED,
    BOOK_STATUS.FINISHED,
  ];

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
          marginBottom: 16,
        },
        errorContainer: {
          padding: 16,
          backgroundColor: theme.colors.errorContainer,
        },
        errorText: {
          color: theme.colors.error,
          textAlign: 'center',
        },
        offlineContainer: {
          padding: 12,
          backgroundColor: theme.colors.secondaryContainer,
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.secondary,
        },
        offlineText: {
          color: theme.colors.onSecondaryContainer,
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
        selectorRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
        },
        selectorButton: {
          flex: 1,
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
        searchButton: {
          marginBottom: 16,
        },
      }),
    [theme]
  );

  const getSortOptionLabel = useCallback((option: SortOption): string => {
    switch (option) {
      case SEARCH_SORT_BY_FIELDS.TITLE:
        return t('books:sort_title');
      case SEARCH_SORT_BY_FIELDS.UPDATE_DATE:
        return t('books:sort_updateDate');
      case SEARCH_SORT_BY_FIELDS.CREATION_DATE:
        return t('books:sort_creationDate');
      case SEARCH_SORT_BY_FIELDS.AUTHOR:
        return t('books:sort_author');
      case SEARCH_SORT_BY_FIELDS.STATUS:
        return t('books:sort_status');
    }
  }, [t]);

  return (
    <PageErrorBoundary>
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title} accessibilityRole="header">
          {t('books:search_books')}
        </Text>

        <Searchbar
          placeholder={t('books:search_books_placeholder')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          accessibilityLabel={t('accessibility:search_books_label', { defaultValue: 'Search books' })}
          onSubmitEditing={handleSubmit}
        />
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.searchButton}
          disabled={loading}
        >
          {loading ? t('common:searching') : t('common:search')}
        </Button>

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
        <View style={styles.selectorRow}>
          <Button
            mode="outlined"
            onPress={() => setAuthorSelectorVisible(true)}
            style={styles.selectorButton}
          >
            {selectedAuthor === null
              ? t('books:select_author')
              : formatFullName(selectedAuthor.name, selectedAuthor.surname)}
          </Button>
          {selectedAuthorId !== null ? (
            <IconButton
              icon="close"
              onPress={() => setSelectedAuthorId(null)}
              accessibilityLabel={`${t('common:clear_all')} ${t('books:filter_by_author')}`}
            />
          ) : null}
        </View>

        {/* Category Filter */}
        <Text variant="labelMedium" style={styles.filterLabel}>
          {t('books:filter_by_category')}
        </Text>
        <View style={styles.selectorRow}>
          <Button
            mode="outlined"
            onPress={() => setCategorySelectorVisible(true)}
            style={styles.selectorButton}
          >
            {selectedCategory === null
              ? t('books:select_category')
              : getCategoryDisplayName(selectedCategory, t)}
          </Button>
          {selectedCategoryId !== null ? (
            <IconButton
              icon="close"
              onPress={() => setSelectedCategoryId(null)}
              accessibilityLabel={`${t('common:clear_all')} ${t('books:filter_by_category')}`}
            />
          ) : null}
        </View>

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
                {getSortOptionLabel(sortBy)} ({sortOrder === SORT_DIRECTIONS.ASC ? '↑' : '↓'})
              </Button>
            }
          >
            {SORT_OPTIONS.map((option) => (
              <Menu.Item
                key={option}
                onPress={() => {
                  setSortBy(option);
                  setShowSortMenu(false);
                }}
                title={getSortOptionLabel(option)}
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

      {loading && displayedBooks.length === 0 && !isbnResult && <LoadingSpinner />}

      <FlatList
        data={displayedBooks}
        renderItem={renderBook}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        onEndReached={() => { if (hasMore && !loading && !isbnResult) void loadMore(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loading && displayedBooks.length > 0 ? <LoadingSpinner /> : null}
        ListEmptyComponent={
          !loading && isbnNotFound ? (
            <EmptyState
              icon="qr-code-scanner"
              title={t('books:no_books_found')}
              description={t('books:isbn_not_found', { defaultValue: 'No book found for this ISBN' })}
            />
          ) : !loading && searchQuery.trim() ? (
            <EmptyState
              icon="search"
              title={t('books:no_books_found')}
              description={t('books:try_different_search')}
            />
          ) : !loading ? (
            <EmptyState
              icon="search"
              title={t('books:start_searching')}
              description={t('books:search_books_placeholder')}
            />
          ) : null
        }
      />

      <AuthorSelectorModal
        visible={authorSelectorVisible}
        authors={availableAuthors}
        selectedAuthorIds={selectedAuthorId === null ? [] : [selectedAuthorId]}
        loading={false}
        onClose={() => setAuthorSelectorVisible(false)}
        onSelectAuthor={(author) => setSelectedAuthorId(Number(author.id))}
      />

      <CategorySelectorModal
        visible={categorySelectorVisible}
        categories={availableCategories}
        selectedCategoryIds={selectedCategoryId === null ? [] : [selectedCategoryId]}
        loading={false}
        singleSelect
        onClose={() => setCategorySelectorVisible(false)}
        onToggleCategory={(categoryId) => {
          setSelectedCategoryId((currentId) => (currentId === categoryId ? null : categoryId));
        }}
      />

      <Snackbar
        visible={feedbackVisible}
        onDismiss={() => setFeedbackVisible(false)}
        duration={3000}
      >
        {feedbackMessage}
      </Snackbar>
    </SafeAreaView>
    </PageErrorBoundary>
  );
}
