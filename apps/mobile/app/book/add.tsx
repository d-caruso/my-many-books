import { useState, useEffect, useRef, useCallback } from 'react';
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
import { OPERATION_TYPES } from '@/services/hooks/eventsSchema';
import { AuthorsSection } from '@/components/book/AuthorsSection';
import { CategoriesSection } from '@/components/book/CategoriesSection';
import { AddBookOverlays } from '@/components/book/AddBookOverlays';
import { addBookStyles as styles } from '@/components/book/addBookStyles';
import { SCANNER_COPY_STATUS, ScannerCopyStatus } from '@/constants/scanner';

export default function AddBookScreen() {
  const { t } = useTranslation();
  const { isbn, bookData, scannerCopy } = useLocalSearchParams<{
    isbn?: string;
    bookData?: string;
    scannerCopy?: ScannerCopyStatus;
  }>();
  const [title, setTitle] = useState('');
  const [isbnCode, setIsbnCode] = useState(isbn || '');
  const [status, setStatus] = useState<Book['status'] | null>(null);
  const [editionDate, setEditionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [authorSelectorOpen, setAuthorSelectorOpen] = useState(false);
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);
  const [addAuthorDialogOpen, setAddAuthorDialogOpen] = useState(false);
  const [manageAuthorsDialogOpen, setManageAuthorsDialogOpen] = useState(false);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [manageCategoriesDialogOpen, setManageCategoriesDialogOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const handledScannerFeedbackRef = useRef<string | null>(null);

  const { createBook } = useBooks();
  const { searchByISBN } = useBookSearch();
  const { isOnline } = useNetworkState();
  const {
    availableAuthors,
    availableCategories,
    selectedAuthors,
    selectedCategoryIds,
    authorsLoading,
    categoriesLoading,
    categoriesSorting,
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

  useEffect(() => {
    if (isbn) {
      setIsbnCode(isbn);
    }
  }, [isbn]);

  useEffect(() => {
    if (bookData) {
      try {
        const book = JSON.parse(decodeURIComponent(bookData));
        setTitle(book.title || '');
        setIsbnCode(book.isbnCode || '');
        setEditionDate(book.editionDate || '');
      } catch (error) {
        mobileHooks.emit(MOBILE_EVENTS.ERROR.VALIDATION, {
          operation: 'parse_book_data',
          error: error instanceof Error ? error.message : String(error),
          source: 'book_add_useEffect'
        });
      }
    }
  }, [bookData]);

  useEffect(() => {
    if (!scannerCopy) {
      return;
    }

    const feedbackKey = `${scannerCopy}:${isbn || ''}`;
    if (handledScannerFeedbackRef.current === feedbackKey) {
      return;
    }
    handledScannerFeedbackRef.current = feedbackKey;

    setFeedbackMessage(
      scannerCopy === SCANNER_COPY_STATUS.SUCCESS
        ? t('scanner:isbn_copied', { defaultValue: 'ISBN copied' })
        : t('scanner:isbn_detected', { defaultValue: 'ISBN detected' })
    );
    setFeedbackVisible(true);

    router.replace({
      pathname: '/book/add',
      params: {
        ...(isbn ? { isbn } : {}),
        ...(bookData ? { bookData } : {}),
      },
    });
  }, [scannerCopy, isbn, bookData, t]);

  useEffect(() => {
    if (!feedbackVisible) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setFeedbackVisible(false);
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, [feedbackVisible]);

  const handleIsbnChange = (value: string) => {
    if (feedbackVisible) {
      setFeedbackVisible(false);
    }
    if (duplicateWarning) {
      setDuplicateWarning(null);
    }
    setIsbnCode(value);
  };

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
        source: 'book_add_embedded_scanner',
      });
      existingBook = null;
    }

    setIsbnCode(isbnValue);
    if (existingBook) {
      setFeedbackVisible(false);
      setFeedbackMessage('');
    } else {
      setFeedbackMessage(
        copyStatus === SCANNER_COPY_STATUS.SUCCESS
          ? t('scanner:isbn_copied', { defaultValue: 'ISBN copied' })
          : t('scanner:isbn_detected', { defaultValue: 'ISBN detected' })
      );
      setFeedbackVisible(true);
    }
    setDuplicateWarning(
      existingBook
        ? t('scanner:isbn_already_exists_in_library', {
            defaultValue: 'A book with this ISBN already exists in your library.',
          })
        : null
    );
    setScannerOpen(false);
  }, [searchByISBN, t]);

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
        status: status ?? undefined,
        editionDate: editionDate || undefined,
        notes: notes.trim(),
        authorIds: selectedAuthors.map((author) => Number(author.id)),
        categoryIds: selectedCategoryIds,
      });

      router.back();
    } catch (err: Error) {
      mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
        operation: OPERATION_TYPES.CREATE,
        resource: RESOURCE_TYPES.BOOK,
        error: err.message,
        statusCode: err.status,
        source: 'book_add_submit'
      });
      setError(t('books:createFailed'));
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
      } else {
        setError(t('books:book_not_found_for_isbn'));
      }
    } catch (err: Error) {
      mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
        operation: 'isbn_lookup',
        resource: RESOURCE_TYPES.BOOK,
        error: err.message,
        isbn: isbnCode.trim(),
        source: 'book_add_isbn_lookup'
      });
      setError(t('books:failed_to_lookup_book'));
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

              {feedbackVisible && !!feedbackMessage && (
                <View style={styles.scannerNoticeContainer} accessibilityLiveRegion="polite">
                  <Text variant="bodyMedium" style={styles.scannerNoticeText}>
                    {feedbackMessage}
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
                accessibilityInvalid={!!error}
                accessibilityErrorMessage={error}
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
                accessibilityLabel={t('books:select_status')}
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
                  accessibilityLabel={t('cancel')}
                >
                  {t('cancel')}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={styles.button}
                  loading={loading}
                  disabled={loading}
                  accessibilityLabel={t('books:add_book')}
                  accessibilityHint={!isOnline ? t('offline.tooltips.willSyncLater') : undefined}
                >
                  {t('books:add_book')}
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
