import { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Card, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';

import { useBooks } from '@/hooks/useBooks';
import { useBookSearch } from '@/hooks/useBookSearch';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useAddBookEntities } from '@/hooks/useAddBookEntities';
import { Book } from '@/types';
import { EditionDateInput } from '@/components/EditionDateInput';
import { mobileHooks, MOBILE_EVENTS, RESOURCE_TYPES } from '@/services/hooks/mobileHooks';
import { extractErrorDetails } from '@my-many-books/shared-utils';
import { OPERATION_TYPES } from '@/services/hooks/eventsSchema';
import { AuthorsSection } from '@/components/book/AuthorsSection';
import { CategoriesSection } from '@/components/book/CategoriesSection';
import { AddBookOverlays } from '@/components/book/AddBookOverlays';
import { useAddBookStyles } from '@/components/book/addBookStyles';
import { SCANNER_COPY_STATUS, ScannerCopyStatus } from '@/constants/scanner';

export default function EditBookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const styles = useAddBookStyles();
  const { books, updateBook } = useBooks();
  const { searchByISBN } = useBookSearch();
  const { isOnline } = useNetworkState();

  const book = books.find(b => String(b.id) === id);

  const [title, setTitle] = useState(book?.title ?? '');
  const [isbnCode, setIsbnCode] = useState(book?.isbnCode ?? '');
  const [status, setStatus] = useState<Book['status'] | null>(book?.status ?? null);
  const [editionDate, setEditionDate] = useState(book?.editionDate ?? '');
  const [notes, setNotes] = useState(book?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [authorSelectorOpen, setAuthorSelectorOpen] = useState(false);
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);
  const [addAuthorDialogOpen, setAddAuthorDialogOpen] = useState(false);
  const [manageAuthorsDialogOpen, setManageAuthorsDialogOpen] = useState(false);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [manageCategoriesDialogOpen, setManageCategoriesDialogOpen] = useState(false);

  const entitiesInitialisedRef = useRef(false);

  const {
    availableAuthors,
    availableCategories,
    selectedAuthors,
    selectedCategoryIds,
    authorsLoading,
    categoriesLoading,
    categoriesSorting,
    setSelectedAuthors,
    setSelectedCategoryIds,
    selectAuthor,
    removeAuthor,
    toggleCategory,
    createAuthorAndSelect,
    createCategoryAndSelect,
    handleAuthorUpdated,
    handleAuthorDeleted,
    handleCategoryUpdated,
    handleCategoryDeleted,
  } = useAddBookEntities();

  const categoriesBusy = categoriesLoading || categoriesSorting;

  // Pre-populate authors and categories once available data is loaded (run once only)
  useEffect(() => {
    if (entitiesInitialisedRef.current) return;
    if (!book?.authors || !book?.categories) return;
    if (availableAuthors.length === 0 || availableCategories.length === 0) return;

    entitiesInitialisedRef.current = true;
    setSelectedAuthors(book.authors as typeof availableAuthors);
    setSelectedCategoryIds(book.categories.map(c => Number(c.id)));
  }, [book?.authors, book?.categories, availableAuthors, availableCategories, setSelectedAuthors, setSelectedCategoryIds]);

  const handleIsbnChange = (value: string) => {
    if (duplicateWarning) setDuplicateWarning(null);
    setIsbnCode(value);
  };

  const handleISBNLookup = async () => {
    if (!isbnCode.trim()) {
      setError(t('books:please_enter_isbn_first'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const found = await searchByISBN(isbnCode.trim());
      if (found) {
        setTitle(found.title || '');
        // Warn if the found book is a different one already in the library
        if (String(found.id) !== id) {
          setDuplicateWarning(
            t('scanner:isbn_already_exists_in_library', {
              defaultValue: 'A book with this ISBN already exists in your library.',
            })
          );
        }
      } else {
        setError(t('books:book_not_found_for_isbn'));
      }
    } catch (err: unknown) {
      const details = extractErrorDetails(err);
      mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
        operation: 'isbn_lookup',
        resource: RESOURCE_TYPES.BOOK,
        error: details.message,
        isbn: isbnCode.trim(),
        source: 'book_edit_isbn_lookup',
      });
      setError(t('books:failed_to_lookup_book'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmbeddedScannerDetected = useCallback(async (isbnValue: string) => {
    let copyStatus: ScannerCopyStatus = SCANNER_COPY_STATUS.FAILED;
    try {
      await Clipboard.setStringAsync(isbnValue);
      copyStatus = SCANNER_COPY_STATUS.SUCCESS;
    } catch {
      copyStatus = SCANNER_COPY_STATUS.FAILED;
    }

    let existingBook: Book | null = null;
    try {
      existingBook = await searchByISBN(isbnValue);
    } catch (err) {
      mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
        operation: 'embedded_scanner_isbn_lookup',
        resource: RESOURCE_TYPES.BOOK,
        error: err instanceof Error ? err.message : String(err),
        isbn: isbnValue,
        source: 'book_edit_embedded_scanner',
      });
    }

    setIsbnCode(isbnValue);
    // Only warn about duplicates if it's a different book
    setDuplicateWarning(
      existingBook && String(existingBook.id) !== id
        ? t('scanner:isbn_already_exists_in_library', {
            defaultValue: 'A book with this ISBN already exists in your library.',
          })
        : null
    );
    setScannerOpen(false);

    // Log clipboard outcome
    if (copyStatus === SCANNER_COPY_STATUS.FAILED) {
      mobileHooks.emit(MOBILE_EVENTS.ERROR.VALIDATION, {
        operation: 'clipboard_copy',
        error: 'Failed to copy ISBN to clipboard',
        source: 'book_edit_embedded_scanner',
      });
    }
  }, [searchByISBN, id, t]);

  const handleCreateAuthor = useCallback(async (input: { name: string; surname: string; nationality?: string }) => {
    const created = await createAuthorAndSelect(input);
    setAddAuthorDialogOpen(false);
    return created;
  }, [createAuthorAndSelect]);

  const handleCreateCategory = useCallback(async (input: { name: string }) => {
    const created = await createCategoryAndSelect(input);
    setAddCategoryDialogOpen(false);
    return created;
  }, [createCategoryAndSelect]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError(t('books:title_required'));
      return;
    }
    if (!book) return;

    setLoading(true);
    setError(null);

    try {
      await updateBook(book.id, {
        title: title.trim(),
        isbnCode: isbnCode.trim(),
        status: status ?? undefined,
        editionDate: editionDate || undefined,
        notes: notes.trim(),
        authorIds: selectedAuthors.map(a => Number(a.id)),
        categoryIds: selectedCategoryIds,
      } as unknown as Partial<Book>);

      router.back();
    } catch (err: unknown) {
      const details = extractErrorDetails(err);
      mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
        operation: OPERATION_TYPES.UPDATE,
        resource: RESOURCE_TYPES.BOOK,
        error: details.message,
        statusCode: details.status,
        source: 'book_edit_submit',
      });
      setError(t('books:updateFailed', { defaultValue: 'Failed to update book' }));
    } finally {
      setLoading(false);
    }
  };

  if (!book) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scrollView}>
          <Text variant="bodyLarge">{t('books:book_not_found', 'Book not found')}</Text>
          <Button onPress={() => router.back()}>{t('common:back')}</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView}>
          <Card style={styles.card}>
            <Card.Content>
              {error && (
                <View style={styles.errorContainer}>
                  <Text variant="bodyMedium" style={styles.errorText} accessibilityLiveRegion="assertive">
                    {error}
                  </Text>
                </View>
              )}

              {duplicateWarning && (
                <View style={styles.duplicateWarningContainer} accessibilityLiveRegion="polite">
                  <Text variant="bodyMedium" style={styles.duplicateWarningText}>
                    {duplicateWarning}
                  </Text>
                </View>
              )}

              <View style={styles.isbnSection}>
                <TextInput
                  label={t('books:isbn_optional')}
                  value={isbnCode}
                  onChangeText={handleIsbnChange}
                  style={styles.isbnInput}
                  keyboardType="default"
                  autoCapitalize="none"
                />
                <View style={styles.isbnActionButtons}>
                  <Button
                    mode="outlined"
                    onPress={handleISBNLookup}
                    disabled={loading || !isbnCode.trim()}
                    style={styles.lookupButton}
                    accessibilityLabel={t('books:lookup_isbn')}
                  >
                    {t('books:lookup')}
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => setScannerOpen(true)}
                    style={styles.scanButton}
                    accessibilityLabel={t('books:scan_isbn')}
                  >
                    {t('books:scan_isbn')}
                  </Button>
                </View>
              </View>

              <TextInput
                label={t('books:title_required_field')}
                value={title}
                onChangeText={setTitle}
                style={styles.input}
                autoCapitalize="words"
                error={!!error}
              />

              <AuthorsSection
                selectedAuthors={selectedAuthors}
                authorsLoading={authorsLoading}
                onOpenSelector={() => setAuthorSelectorOpen(true)}
                onOpenManage={() => setManageAuthorsDialogOpen(true)}
                onOpenAdd={() => setAddAuthorDialogOpen(true)}
                onRemoveAuthor={removeAuthor}
              />

              <CategoriesSection
                categoriesLoading={categoriesBusy}
                availableCategories={availableCategories}
                selectedCategoryIds={selectedCategoryIds}
                onOpenSelector={() => setCategorySelectorOpen(true)}
                onOpenManage={() => setManageCategoriesDialogOpen(true)}
                onOpenAdd={() => setAddCategoryDialogOpen(true)}
                onToggleCategory={toggleCategory}
              />

              <Text variant="titleSmall" style={styles.sectionTitle} accessibilityRole="header">
                {t('books:reading_status')}
              </Text>
              <SegmentedButtons
                value={status || ''}
                onValueChange={(value) => setStatus(value ? (value as Book['status']) : null)}
                buttons={[
                  { value: '', label: t('common:none', { defaultValue: 'None' }) },
                  { value: 'reading', label: t('books:reading') },
                  { value: 'paused', label: t('books:paused') },
                  { value: 'finished', label: t('books:finished') },
                ]}
                style={styles.segmentedButtons}
              />

              <EditionDateInput
                value={editionDate}
                onChange={setEditionDate}
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
                >
                  {t('cancel')}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={styles.button}
                  loading={loading}
                  disabled={loading}
                  accessibilityHint={!isOnline ? t('offline.tooltips.willSyncLater') : undefined}
                >
                  {t('books:save_changes', { defaultValue: 'Save changes' })}
                </Button>
              </View>
              {!isOnline && (
                <Text variant="bodySmall" style={styles.offlineHint}>
                  {t('offline.tooltips.willSyncLater')}
                </Text>
              )}
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <AddBookOverlays
        scannerOpen={scannerOpen}
        onScannerClose={() => setScannerOpen(false)}
        onScannerDetected={handleEmbeddedScannerDetected}
        authorSelectorOpen={authorSelectorOpen}
        availableAuthors={availableAuthors}
        selectedAuthorIds={selectedAuthors.map((author) => Number(author.id))}
        authorsLoading={authorsLoading}
        onCloseAuthorSelector={() => setAuthorSelectorOpen(false)}
        onSelectAuthor={selectAuthor}
        onOpenAddAuthorFromSelector={() => {
          setAuthorSelectorOpen(false);
          setAddAuthorDialogOpen(true);
        }}
        categorySelectorOpen={categorySelectorOpen}
        availableCategories={availableCategories}
        selectedCategoryIds={selectedCategoryIds}
        categoriesLoading={categoriesBusy}
        onCloseCategorySelector={() => setCategorySelectorOpen(false)}
        onToggleCategory={toggleCategory}
        onOpenAddCategoryFromSelector={() => {
          setCategorySelectorOpen(false);
          setAddCategoryDialogOpen(true);
        }}
        addAuthorDialogOpen={addAuthorDialogOpen}
        onCloseAddAuthorDialog={() => setAddAuthorDialogOpen(false)}
        onCreateAuthor={handleCreateAuthor}
        manageAuthorsDialogOpen={manageAuthorsDialogOpen}
        onCloseManageAuthorsDialog={() => setManageAuthorsDialogOpen(false)}
        onAuthorUpdated={handleAuthorUpdated}
        onAuthorDeleted={handleAuthorDeleted}
        addCategoryDialogOpen={addCategoryDialogOpen}
        onCloseAddCategoryDialog={() => setAddCategoryDialogOpen(false)}
        onCreateCategory={handleCreateCategory}
        manageCategoriesDialogOpen={manageCategoriesDialogOpen}
        onCloseManageCategoriesDialog={() => setManageCategoriesDialogOpen(false)}
        onCategoryUpdated={handleCategoryUpdated}
        onCategoryDeleted={handleCategoryDeleted}
      />
    </SafeAreaView>
  );
}
