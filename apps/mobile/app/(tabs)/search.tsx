import React, { useState } from 'react';
import { View, FlatList } from 'react-native';
import { Searchbar, Text, SegmentedButtons } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookCard } from '@/components/BookCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useBookSearch } from '@/hooks/useBookSearch';
import { Book } from '@my-many-books/shared-types';

type SearchMode = 'title' | 'author' | 'isbn';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('title');
  
  const {
    books,
    loading,
    error,
    searchBooks,
    searchByISBN,
    clearSearch,
  } = useBookSearch();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      clearSearch();
      return;
    }

    if (searchMode === 'isbn') {
      const book = await searchByISBN(query);
      if (book) {
        // For ISBN search, we just show the single result
        // This would need to be handled differently in the actual implementation
      }
    } else {
      const filters = searchMode === 'author' ? { authorName: query } : {};
      await searchBooks(query, filters);
    }
  };

  const renderBook = ({ item }: { item: Book }) => (
    <BookCard
      book={item}
      onPress={() => {}}
      showActions={false}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Search Books
        </Text>
        
        <SegmentedButtons
          value={searchMode}
          onValueChange={(value) => setSearchMode(value as SearchMode)}
          buttons={[
            { value: 'title', label: 'Title' },
            { value: 'author', label: 'Author' },
            { value: 'isbn', label: 'ISBN' },
          ]}
          style={styles.segmentedButtons}
        />
        
        <Searchbar
          placeholder={`Search by ${searchMode}...`}
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text variant="bodyMedium" style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      {loading && books.length === 0 && <LoadingSpinner />}

      <FlatList
        data={books}
        renderItem={renderBook}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !loading && searchQuery.trim() ? (
            <EmptyState
              icon="magnify"
              title="No books found"
              description="Try adjusting your search terms"
            />
          ) : !loading ? (
            <EmptyState
              icon="magnify"
              title="Start searching"
              description="Enter a book title, author, or ISBN to begin"
            />
          ) : null
        }
      />
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
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
});