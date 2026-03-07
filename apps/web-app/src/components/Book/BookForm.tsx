import React, { useState, useEffect, useMemo } from 'react';
import {
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  FormControl,
  Select,
  MenuItem,
  Chip,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Stack,
  Divider,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { useTranslation } from 'react-i18next';
import type { Book, Author, Category } from '@my-many-books/shared-types';
import { useCategories } from '../../hooks/useCategories';
import { useBookSearch } from '../../hooks/useBookSearch';
import { AuthorAutocomplete } from '../Search/AuthorAutocomplete';
import { AddAuthorDialog } from '../Author/AddAuthorDialog';
import { ManageAuthorsDialog } from '../Author/ManageAuthorsDialog';
import { AddCategoryDialog } from '../Category/AddCategoryDialog';
import { ManageCategoriesDialog } from '../Category/ManageCategoriesDialog';
import { EmbeddedScannerFlow } from '../Scanner/EmbeddedScannerFlow';
import { normalizeIsbn } from '@my-many-books/shared-validation';
import { createCategoryDisplayNameComparator, getCategoryDisplayName } from '@my-many-books/shared-utils';
import { createBookSchema } from '../../validation/bookSchemas';
import { EditionDateInput } from './EditionDateInput';

interface BookFormProps {
  book?: Book | null;
  onSubmit: (bookData: BookFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
  apiErrors?: Array<{ field: string; message: string }>;
  initialIsbn?: string;
  initialDraft?: Partial<BookFormData> | null;
  scannerPrefillNotice?: string | null;
  onScannerPrefillNoticeDismiss?: () => void;
}

export interface BookFormData {
  title: string;
  isbnCode: string;
  editionNumber?: number;
  editionDate?: string;
  status?: NonNullable<Book['status']>;
  notes?: string;
  selectedAuthors: Author[];
  selectedCategories: number[];
}

const EDITION_DATE_ERROR_I18N_KEY = 'validation:book_edition_date_invalid';

const buildNewBookFormData = (
  initialIsbn?: string,
  initialDraft?: Partial<BookFormData> | null
): BookFormData => {
  const draft = initialDraft ?? {};

  return {
    title: typeof draft.title === 'string' ? draft.title : '',
    isbnCode: initialIsbn ?? (typeof draft.isbnCode === 'string' ? draft.isbnCode : ''),
    editionNumber: typeof draft.editionNumber === 'number' ? draft.editionNumber : undefined,
    editionDate: typeof draft.editionDate === 'string' ? draft.editionDate : '',
    status: draft.status,
    notes: typeof draft.notes === 'string' ? draft.notes : '',
    selectedAuthors: Array.isArray(draft.selectedAuthors) ? [...draft.selectedAuthors] : [],
    selectedCategories: Array.isArray(draft.selectedCategories) ? [...draft.selectedCategories] : [],
  };
};

export const BookForm: React.FC<BookFormProps> = ({
  book,
  onSubmit,
  onCancel,
  loading = false,
  title,
  apiErrors = [],
  initialIsbn,
  initialDraft = null,
  scannerPrefillNotice = null,
  onScannerPrefillNoticeDismiss
}) => {
  const { t, i18n } = useTranslation(['books', 'common', 'scanner', 'validation', 'categories']);
  const categorySortComparator = useMemo(
    () => createCategoryDisplayNameComparator<Category>(t, i18n.language),
    [t, i18n.language]
  );
  const {
    categories,
    loading: categoriesLoading,
    sorting: categoriesSorting,
    loadCategories
  } = useCategories({ sortComparator: categorySortComparator });
  const categoriesBusy = categoriesLoading || categoriesSorting;
  const { searchByISBN } = useBookSearch();
  const defaultTitle = book ? t('books:edit_book_form') : t('books:add_new_book');
  const [formData, setFormData] = useState<BookFormData>(() =>
    buildNewBookFormData(!book ? initialIsbn : undefined, !book ? initialDraft : null)
  );
  const [errors, setErrors] = useState<Partial<Record<keyof BookFormData, string>>>({});
  const [addAuthorDialogOpen, setAddAuthorDialogOpen] = useState(false);
  const [manageAuthorsDialogOpen, setManageAuthorsDialogOpen] = useState(false);
  const [authorAutocompleteReloadTrigger, setAuthorAutocompleteReloadTrigger] = useState(0);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [manageCategoriesDialogOpen, setManageCategoriesDialogOpen] = useState(false);
  const [showScannerPrefillNotice, setShowScannerPrefillNotice] = useState(Boolean(scannerPrefillNotice));
  const [embeddedScannerOpen, setEmbeddedScannerOpen] = useState(false);
  const [embeddedScannerNotice, setEmbeddedScannerNotice] = useState<string | null>(null);
  const [showEmbeddedScannerNotice, setShowEmbeddedScannerNotice] = useState(false);
  const [duplicateIsbnWarning, setDuplicateIsbnWarning] = useState<string | null>(null);

  // Initialize form with book data
  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title,
        isbnCode: book.isbnCode,
        editionNumber: book.editionNumber ?? undefined,
        editionDate: book.editionDate ?? '',
        status: book.status ?? undefined,
        notes: book.notes || '',
        selectedAuthors: book.authors || [],
        selectedCategories: book.categories?.map((cat: Category) => cat.id) || []
      });
    }
  }, [book]);

  useEffect(() => {
    if (book) {
      return;
    }

    if (!initialDraft && !initialIsbn) {
      return;
    }

    // Scanner round-trip draft restoration can arrive after initial mount.
    setFormData(buildNewBookFormData(initialIsbn, initialDraft));
  }, [book, initialDraft, initialIsbn]);

  useEffect(() => {
    setShowScannerPrefillNotice(Boolean(scannerPrefillNotice));
  }, [scannerPrefillNotice]);

  useEffect(() => {
    if (!showScannerPrefillNotice || !scannerPrefillNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowScannerPrefillNotice(false);
      onScannerPrefillNoticeDismiss?.();
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [showScannerPrefillNotice, scannerPrefillNotice, onScannerPrefillNoticeDismiss]);

  useEffect(() => {
    if (!showEmbeddedScannerNotice || !embeddedScannerNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowEmbeddedScannerNotice(false);
      setEmbeddedScannerNotice(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [showEmbeddedScannerNotice, embeddedScannerNotice]);

  // Update errors when API errors change
  useEffect(() => {
    if (apiErrors.length > 0) {
      const newErrors: Partial<Record<keyof BookFormData, string>> = {};
      apiErrors.forEach((error) => {
        const field = error.field as keyof BookFormData;
        if (field) {
          newErrors[field] = error.message;
        }
      });
      setErrors(newErrors);
    }
  }, [apiErrors]);

  const validateForm = (): boolean => {
    // Use Zod schema for validation
    const result = createBookSchema.safeParse(formData);

    if (!result.success) {
      // Convert Zod errors to field-level errors
      const newErrors: Partial<Record<keyof BookFormData, string>> = {};

      result.error.issues.forEach((err) => {
        const field = err.path[0] as keyof BookFormData;
        if (field && !newErrors[field]) {
          if (field === 'editionDate') {
            newErrors[field] = EDITION_DATE_ERROR_I18N_KEY;
            return;
          }

          newErrors[field] = err.message;
        }
      });

      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Normalize ISBN before submitting (remove hyphens/spaces, uppercase)
      const normalized = normalizeIsbn(formData.isbnCode);
      const submissionData = {
        ...formData,
        isbnCode: normalized || formData.isbnCode.trim(),
      };

      await onSubmit(submissionData);
    } catch (error: any) {
      console.error('Form submission error:', error);
      console.error('Error response:', error?.response?.data);
    }
  };

  const handleInputChange = (field: keyof BookFormData, value: string | number | Author[] | number[] | undefined) => {
    if (field === 'isbnCode' && showScannerPrefillNotice) {
      setShowScannerPrefillNotice(false);
      onScannerPrefillNoticeDismiss?.();
    }
    if (field === 'isbnCode') {
      if (showEmbeddedScannerNotice) {
        setShowEmbeddedScannerNotice(false);
      }
      if (embeddedScannerNotice) {
        setEmbeddedScannerNotice(null);
      }
      if (duplicateIsbnWarning) {
        setDuplicateIsbnWarning(null);
      }
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAuthorAdd = (author: Author | null) => {
    if (author && !formData.selectedAuthors.find(a => a.id === author.id)) {
      handleInputChange('selectedAuthors', [...formData.selectedAuthors, author]);
    }
  };

  const handleAuthorRemove = (authorId: number) => {
    handleInputChange('selectedAuthors', 
      formData.selectedAuthors.filter(a => a.id !== authorId)
    );
  };

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    if (checked) {
      handleInputChange('selectedCategories', [...formData.selectedCategories, categoryId]);
    } else {
      handleInputChange('selectedCategories',
        formData.selectedCategories.filter(id => id !== categoryId)
      );
    }
  };

  const handleAuthorCreated = (author: Author) => {
    // Add the newly created author to the selected authors list
    handleInputChange('selectedAuthors', [...formData.selectedAuthors, author]);
    // Refresh the preloaded author options so the new author is immediately available in the dropdown.
    setAuthorAutocompleteReloadTrigger((prev) => prev + 1);
  };

  const handleCategoryCreated = (category: Category) => {
    // Reload categories to update the list
    loadCategories();
    // Automatically select the newly created category
    handleInputChange('selectedCategories', [...formData.selectedCategories, category.id]);
  };

  const handleAuthorUpdated = (updatedAuthor: Author) => {
    handleInputChange(
      'selectedAuthors',
      formData.selectedAuthors.map((author) =>
        author.id === updatedAuthor.id ? updatedAuthor : author
      )
    );
    setAuthorAutocompleteReloadTrigger((prev) => prev + 1);
  };

  const handleAuthorDeleted = (deletedAuthorId: number) => {
    handleInputChange(
      'selectedAuthors',
      formData.selectedAuthors.filter((author) => author.id !== deletedAuthorId)
    );
    setAuthorAutocompleteReloadTrigger((prev) => prev + 1);
  };

  const handleCategoryUpdated = () => {
    loadCategories();
  };

  const handleCategoryDeleted = (deletedCategoryId: number) => {
    void loadCategories();
    handleInputChange(
      'selectedCategories',
      formData.selectedCategories.filter((id) => id !== deletedCategoryId)
    );
  };

  const handleScanIsbn = () => {
    setEmbeddedScannerOpen(true);
  };

  const handleEmbeddedScannerClose = () => {
    setEmbeddedScannerOpen(false);
  };

  const handleEmbeddedScannerSuccess = async (result: { isbn: string }) => {
    const scannedIsbn = result.isbn;
    let copyStatus: 'success' | 'failed' = 'failed';

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(scannedIsbn);
        copyStatus = 'success';
      }
    } catch {
      copyStatus = 'failed';
    }

    let existingBook: Book | null = null;
    try {
      existingBook = await searchByISBN(scannedIsbn);
    } catch {
      existingBook = null;
    }

    setFormData(prev => ({ ...prev, isbnCode: scannedIsbn }));
    setErrors(prev => ({ ...prev, isbnCode: undefined }));
    setDuplicateIsbnWarning(
      existingBook
        ? t('scanner:isbn_already_exists_in_library', {
            defaultValue: 'A book with this ISBN already exists in your library.',
          })
        : null
    );
    if (existingBook) {
      setEmbeddedScannerNotice(null);
      setShowEmbeddedScannerNotice(false);
    } else {
      setEmbeddedScannerNotice(
        copyStatus === 'success'
          ? t('scanner:isbn_copied', { defaultValue: 'ISBN copied' })
          : t('scanner:isbn_detected', { defaultValue: 'ISBN detected' })
      );
      setShowEmbeddedScannerNotice(true);
    }
    setEmbeddedScannerOpen(false);
  };

  const isbnHintText = t('books:isbn_no_dashes_spaces_hint', {
    defaultValue: 'Write the code without dashes or spaces',
  });
  const editionDateHelperText =
    errors.editionDate === EDITION_DATE_ERROR_I18N_KEY
      ? t(EDITION_DATE_ERROR_I18N_KEY, {
          defaultValue: errors.editionDate,
        })
      : errors.editionDate;

  return (
    <Paper elevation={3} sx={{ overflow: 'hidden' }}>
      <Box sx={{ px: 3, py: 2, bgcolor: 'primary.50', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" fontWeight="600" color="text.primary">
          {title || defaultTitle}
        </Typography>
        <IconButton
          onClick={onCancel}
          aria-label={t('common:close')}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Title */}
          <TextField
            fullWidth
            required
            id="title"
            label={t('books:title')}
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder={t('books:enter_book_title')}
            disabled={loading}
            error={!!errors.title}
            helperText={errors.title}
          />

          {/* ISBN */}
          {showScannerPrefillNotice && scannerPrefillNotice && (
            <Alert severity="success" onClose={() => {
              setShowScannerPrefillNotice(false);
              onScannerPrefillNoticeDismiss?.();
            }}>
              {scannerPrefillNotice}
            </Alert>
          )}

          {showEmbeddedScannerNotice && embeddedScannerNotice && (
            <Alert
              severity="success"
              onClose={() => {
                setShowEmbeddedScannerNotice(false);
                setEmbeddedScannerNotice(null);
              }}
            >
              {embeddedScannerNotice}
            </Alert>
          )}

          {duplicateIsbnWarning && (
            <Alert severity="warning" onClose={() => setDuplicateIsbnWarning(null)}>
              {duplicateIsbnWarning}
            </Alert>
          )}

          {!book ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr auto', md: '1fr' },
                gap: 2,
                alignItems: 'start'
              }}
            >
              <TextField
                fullWidth
                required
                id="isbnCode"
                label={t('books:isbn')}
                value={formData.isbnCode}
                onChange={(e) => handleInputChange('isbnCode', e.target.value)}
                placeholder={t('books:isbn_placeholder')}
                disabled={loading}
                error={!!errors.isbnCode}
                helperText={errors.isbnCode || isbnHintText}
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                }}
                sx={{ fontFamily: 'monospace' }}
              />
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <Tooltip title={t('books:scan_isbn')}>
                  <span>
                    <Button
                      variant="outlined"
                      startIcon={<QrCodeScannerIcon aria-hidden="true" />}
                      onClick={handleScanIsbn}
                      disabled={loading}
                      aria-label={t('books:scan_isbn')}
                      sx={{
                        width: { xs: '100%', sm: 'auto' },
                        minHeight: 56,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('books:scan_isbn')}
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          ) : (
            <TextField
              fullWidth
              required
              id="isbnCode"
              label={t('books:isbn')}
              value={formData.isbnCode}
              onChange={(e) => handleInputChange('isbnCode', e.target.value)}
              placeholder={t('books:isbn_placeholder')}
              disabled={loading}
              error={!!errors.isbnCode}
              helperText={errors.isbnCode || isbnHintText}
              inputProps={{
                inputMode: 'numeric',
                pattern: '[0-9]*',
              }}
              sx={{ fontFamily: 'monospace' }}
            />
          )}

          {/* Authors and Reading Status */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              alignItems: 'start'
            }}
          >
            {/* Authors */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mr: 1.25 }}>
                  {t('books:author')}
                </Typography>
                <Tooltip title={t('common:add')}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => setAddAuthorDialogOpen(true)}
                      disabled={loading}
                      aria-label={t('common:add')}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={t('common:manage', { defaultValue: 'Manage' })}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => setManageAuthorsDialogOpen(true)}
                      disabled={loading}
                      aria-label={t('common:manage', { defaultValue: 'Manage' })}
                    >
                      <EditNoteOutlinedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
              <AuthorAutocomplete
                value={null}
                onChange={handleAuthorAdd}
                placeholder={t('books:search_add_authors')}
                disabled={loading}
                reloadTrigger={authorAutocompleteReloadTrigger}
                userIdFilter={book?.userId}
              />
            </Box>

            {/* Status */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, height: '28px' }}>
                <Typography id="status-label" variant="subtitle2" color="text.secondary">
                  {t('books:reading_status')}
                </Typography>
              </Box>
              <FormControl fullWidth>
                <Select
                  labelId="status-label"
                  id="status"
                  value={formData.status || ''}
                  onChange={(e) => handleInputChange('status', !e.target.value ? undefined : e.target.value as NonNullable<Book['status']>)}
                >
                  <MenuItem value="">&nbsp;</MenuItem>
                  <MenuItem value="reading">{t('books:reading')}</MenuItem>
                  <MenuItem value="paused">{t('books:paused')}</MenuItem>
                  <MenuItem value="finished">{t('books:finished')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Selected Authors Display */}
          {formData.selectedAuthors.length > 0 && (
            <Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {formData.selectedAuthors.map((author) => (
                  <Chip
                    key={author.id}
                    label={`${author.name} ${author.surname}`}
                    onDelete={() => handleAuthorRemove(author.id)}
                    deleteIcon={<CloseIcon />}
                    disabled={loading}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Categories */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mr: 1.25 }}>
                {t('books:categories')}
              </Typography>
              <Tooltip title={t('common:add')}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => setAddCategoryDialogOpen(true)}
                    disabled={loading}
                    aria-label={t('common:add')}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('common:manage', { defaultValue: 'Manage' })}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => setManageCategoriesDialogOpen(true)}
                    disabled={loading}
                    aria-label={t('common:manage', { defaultValue: 'Manage' })}
                  >
                    <EditNoteOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            {categoriesBusy ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  {t('books:loading_categories')}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
                  gap: 1,
                  maxHeight: 200,
                  overflowY: 'auto',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2
                }}
              >
                {categories.map((category) => (
                  <FormControlLabel
                    key={category.id}
                    control={
                      <Checkbox
                        checked={formData.selectedCategories.includes(category.id)}
                        onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                        disabled={loading}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {getCategoryDisplayName(category, t)}
                      </Typography>
                    }
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Edition Info */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            {/* Edition Number */}
            <TextField
              fullWidth
              type="number"
              id="editionNumber"
              label={t('books:edition_number')}
              value={formData.editionNumber || ''}
              onChange={(e) => handleInputChange('editionNumber',
                e.target.value ? parseInt(e.target.value) : undefined
              )}
              placeholder={t('books:edition_number_placeholder')}
              inputProps={{ min: 1 }}
              disabled={loading}
              error={!!errors.editionNumber}
              helperText={errors.editionNumber}
            />

            {/* Edition Date */}
            <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
              <EditionDateInput
                value={formData.editionDate}
                onChange={(val) => handleInputChange('editionDate', val)}
                disabled={loading}
                error={!!errors.editionDate}
                helperText={editionDateHelperText}
              />
            </Box>
          </Box>

          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={4}
            id="notes"
            label={t('books:notes')}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder={t('books:add_notes_placeholder')}
            disabled={loading}
          />

          <Divider />
          
          {/* Form Actions */}
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              justifyContent: 'flex-end',
              pt: 2,
              borderTop: 1,
              borderColor: 'divider'
            }}
          >
            <Button
              type="button"
              variant="outlined"
              size="large"
              onClick={onCancel}
              disabled={loading}
              startIcon={<CancelIcon />}
              sx={{ minWidth: 120, order: { xs: 2, sm: 1 } }}
            >
              {t('common:cancel')}
            </Button>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              sx={{
                minWidth: 160,
                order: { xs: 1, sm: 2 },
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              {loading ? t('books:saving') : book ? t('books:update_book') : t('books:save_book')}
            </Button>
          </Box>
        </Stack>
      </Box>

      {/* Dialogs */}
      <AddAuthorDialog
        open={addAuthorDialogOpen}
        onClose={() => setAddAuthorDialogOpen(false)}
        onAuthorCreated={handleAuthorCreated}
      />

      <ManageAuthorsDialog
        open={manageAuthorsDialogOpen}
        onClose={() => setManageAuthorsDialogOpen(false)}
        onAuthorUpdated={handleAuthorUpdated}
        onAuthorDeleted={handleAuthorDeleted}
      />

      <AddCategoryDialog
        open={addCategoryDialogOpen}
        onClose={() => setAddCategoryDialogOpen(false)}
        onCategoryCreated={handleCategoryCreated}
      />

      <ManageCategoriesDialog
        open={manageCategoriesDialogOpen}
        onClose={() => setManageCategoriesDialogOpen(false)}
        onCategoryUpdated={handleCategoryUpdated}
        onCategoryDeleted={handleCategoryDeleted}
      />

      <EmbeddedScannerFlow
        isOpen={embeddedScannerOpen}
        onClose={handleEmbeddedScannerClose}
        onScanSuccess={handleEmbeddedScannerSuccess}
      />
    </Paper>
  );
};
