import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card, Chip, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useBooks } from '@/hooks/useBooks';
import { useBookSearch } from '@/hooks/useBookSearch';
import { Book } from '@/types';

export default function AddBookScreen() {
  const { t } = useTranslation();
  const { isbn, bookData } = useLocalSearchParams<{ isbn?: string; bookData?: string }>();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbnCode, setIsbnCode] = useState(isbn || '');
  const [status, setStatus] = useState<Book['status']>('want-to-read');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createBook } = useBooks();
  const { searchByISBN } = useBookSearch();

  useEffect(() => {
    if (bookData) {
      try {
        const book = JSON.parse(decodeURIComponent(bookData));
        setTitle(book.title || '');
        setAuthor(book.authors?.map((a: any) => a.name).join(', ') || '');
        setIsbnCode(book.isbnCode || '');
      } catch (error) {
        console.error('Failed to parse book data:', error);
      }
    }
  }, [bookData]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError(t('books:title_required'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createBook({
        title: title.trim(),
        isbnCode: isbnCode.trim(),
        status,
        notes: notes.trim(),
        // Note: In a real implementation, you'd need to handle authors/categories properly
      });

      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to add book');
    } finally {
      setLoading(false);
    }
  };

  const handleISBNLookup = async () => {
    if (!isbnCode.trim()) {
      setError(t('books:please_enter_isbn_first'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const book = await searchByISBN(isbnCode.trim());
      if (book) {
        setTitle(book.title || '');
        setAuthor(book.authors?.map(a => a.name).join(', ') || '');
      } else {
        setError(t('books:book_not_found_for_isbn'));
      }
    } catch (err: any) {
      setError(err.message || t('books:failed_to_lookup_book'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.title} accessibilityRole="header">
                {t('books:add_new_book')}
              </Text>

              {error && (
                <View style={styles.errorContainer}>
                  <Text variant="bodyMedium" style={styles.errorText} accessibilityLiveRegion="assertive" nativeID="addBookError">
                    {error}
                  </Text>
                </View>
              )}

              <View style={styles.isbnSection}>
                <TextInput
                  label={t('books:isbn_optional')}
                  value={isbnCode}
                  onChangeText={setIsbnCode}
                  style={styles.input}
                  keyboardType="default"
                  autoCapitalize="none"
                />
                <Button
                  mode="outlined"
                  onPress={handleISBNLookup}
                  disabled={loading || !isbnCode.trim()}
                  style={styles.lookupButton}
                  accessibilityLabel="Lookup book by ISBN"
                >
                  {t('books:lookup')}
                </Button>
              </View>

              <TextInput
                label={t('books:title_required_field')}
                value={title}
                onChangeText={setTitle}
                style={styles.input}
                autoCapitalize="words"
                accessibilityInvalid={!!error}
                accessibilityErrorMessage={error}
              />

              <TextInput
                label={t('books:author_field')}
                value={author}
                onChangeText={setAuthor}
                style={styles.input}
                autoCapitalize="words"
              />

              <Text variant="titleSmall" style={styles.sectionTitle} accessibilityRole="header">
                {t('books:reading_status')}
              </Text>
              <SegmentedButtons
                value={status}
                onValueChange={(value) => setStatus(value as Book['status'])}
                buttons={[
                  { value: 'want-to-read', label: t('books:want_to_read') },
                  { value: 'reading', label: t('books:reading') },
                  { value: 'completed', label: t('books:completed') },
                ]}
                style={styles.segmentedButtons}
                accessibilityLabel="Select reading status"
              />

              <TextInput
                label={t('books:notes_optional')}
                value={notes}
                onChangeText={setNotes}
                style={styles.input}
                multiline
                numberOfLines={3}
                autoCapitalize="sentences"
              />

              <View style={styles.buttonContainer}>
                <Button
                  mode="outlined"
                  onPress={() => router.back()}
                  style={styles.button}
                  disabled={loading}
                  accessibilityLabel="Cancel adding book"
                >
                  {t('cancel')}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={styles.button}
                  loading={loading}
                  disabled={loading}
                  accessibilityLabel="Add book to library"
                >
                  {t('books:add_book')}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  isbnSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  lookupButton: {
    marginLeft: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
});