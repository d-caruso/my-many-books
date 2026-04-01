import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { BookForm } from '../../../components/Book/BookForm';

const mockSearchByISBN = vi.fn();
const mockDetailedIsbnSearch = vi.fn();
const mockLoadCategories = vi.fn();
let latestAuthorAutocompleteProps: Record<string, unknown> | null = null;

vi.mock('../../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [],
    loading: false,
    loadCategories: mockLoadCategories,
  }),
}));

vi.mock('../../../hooks/useBookSearch', () => ({
  useBookSearch: () => ({
    searchByISBN: mockSearchByISBN,
  }),
}));

vi.mock('../../../components/Search/AuthorAutocomplete', () => ({
  AuthorAutocomplete: (props: Record<string, unknown>) => {
    latestAuthorAutocompleteProps = props;
    return (
      <div data-testid="author-autocomplete">
        <div data-testid="author-autocomplete-reload-trigger">{String(props.reloadTrigger ?? 0)}</div>
      </div>
    );
  },
}));

vi.mock('../../../components/Author/AddAuthorDialog', () => ({
  AddAuthorDialog: ({ open, onAuthorCreated, onClose }: { open: boolean; onAuthorCreated: (a: unknown) => void; onClose: () => void }) =>
    open ? (
      <div data-testid="add-author-dialog">
        <button
          data-testid="create-author-success"
          onClick={() =>
            onAuthorCreated({
              id: 999,
              name: 'Virginia',
              surname: 'Woolf',
            })
          }
        >
          Create author success
        </button>
        <button data-testid="close-add-author-dialog" onClick={onClose}>
          Close author dialog
        </button>
      </div>
    ) : null,
}));

vi.mock('../../../components/Category/AddCategoryDialog', () => ({
  AddCategoryDialog: () => null,
}));

vi.mock('../../../components/Author/ManageAuthorsDialog', () => ({
  ManageAuthorsDialog: ({ open, onAuthorUpdated, onAuthorDeleted }: { open: boolean; onAuthorUpdated?: (a: unknown) => void; onAuthorDeleted?: (id: number) => void }) =>
    open ? (
      <div data-testid="manage-authors-dialog">
        <button
          data-testid="manage-author-update"
          onClick={() =>
            onAuthorUpdated?.({
              id: 999,
              name: 'Virginia',
              surname: 'WOOLF',
              nationality: 'British',
            })
          }
        >
          Update author
        </button>
        <button data-testid="manage-author-delete" onClick={() => onAuthorDeleted?.(999)}>
          Delete author
        </button>
      </div>
    ) : null,
}));

vi.mock('../../../components/Category/ManageCategoriesDialog', () => ({
  ManageCategoriesDialog: ({ open, onCategoryDeleted }: { open: boolean; onCategoryDeleted?: (id: number) => void }) =>
    open ? (
      <div data-testid="manage-categories-dialog">
        <button data-testid="manage-category-delete" onClick={() => onCategoryDeleted?.(123)}>
          Delete category
        </button>
      </div>
    ) : null,
}));

vi.mock('../../../components/Scanner/EmbeddedScannerFlow', () => ({
  EmbeddedScannerFlow: ({ isOpen, onClose, onScanSuccess }: { isOpen: boolean; onClose: () => void; onScanSuccess: (r: unknown) => void }) =>
    isOpen ? (
      <div data-testid="embedded-scanner-flow">
        <button
          data-testid="embedded-scan-success"
          onClick={() => onScanSuccess({ isbn: '9781234567890', success: true })}
        >
          Scan success
        </button>
        <button data-testid="embedded-scanner-close" onClick={onClose}>
          Close scanner
        </button>
      </div>
    ) : null,
}));

const testI18n = i18n.createInstance();
const i18nReady = testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['books', 'common', 'scanner'],
  defaultNS: 'books',
  resources: {
    en: {
      books: {
        add_new_book: 'Add New Book',
        title: 'Title',
        enter_book_title: 'Enter title',
        isbn: 'ISBN',
        isbn_placeholder: 'Enter ISBN',
        isbn_no_dashes_spaces_hint: 'Write the code without dashes or spaces',
        isbn_lookup_button: 'Look up',
        isbn_invalid: 'Invalid ISBN format',
        isbn_owned_book_found: 'You have this book',
        isbn_valid_no_metadata: 'Valid ISBN - fill in the details',
        scan_isbn: 'Scan ISBN',
        author: 'Author',
        search_add_authors: 'Search authors',
        reading_status: 'Reading Status',
        reading: 'Reading',
        paused: 'Paused',
        finished: 'Finished',
        categories: 'Categories',
        loading_categories: 'Loading categories',
        edition_number: 'Edition Number',
        edition_date: 'Edition Date',
        notes: 'Notes',
        save_book: 'Save Book',
        update_book: 'Update Book',
      },
      scanner: {
        isbn_copied: 'ISBN copied',
        isbn_detected: 'ISBN detected',
        isbn_already_exists_in_library: 'A book with this ISBN already exists in your library.',
      },
      common: {
        close: 'Close',
        add: 'Add',
        cancel: 'Cancel',
        save: 'Save',
      },
    },
  },
  interpolation: { escapeValue: false },
});

const t = (key: string): string => testI18n.t(key);
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const translatedLabelMatcher = (key: string): RegExp => new RegExp(escapeRegExp(t(key)), 'i');

const renderBookForm = (props: Partial<React.ComponentProps<typeof BookForm>> = {}) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <BookForm
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onCancel={vi.fn()}
        onIsbnSearch={mockDetailedIsbnSearch}
        {...props}
      />
    </I18nextProvider>
  );

describe('BookForm', () => {
  beforeAll(async () => {
    await i18nReady;
  });

  beforeEach(() => {
    mockSearchByISBN.mockReset();
    mockDetailedIsbnSearch.mockReset();
    mockLoadCategories.mockReset();
    latestAuthorAutocompleteProps = null;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  test('locks all add-book fields except ISBN on initial open', () => {
    renderBookForm();

    expect(screen.getByRole('textbox', { name: translatedLabelMatcher('books:isbn') })).not.toBeDisabled();
    expect(screen.getByLabelText(translatedLabelMatcher('books:title'))).toBeDisabled();
    expect(screen.getByLabelText(translatedLabelMatcher('books:notes'))).toBeDisabled();
    expect(screen.getByRole('button', { name: t('books:save_book') })).toBeDisabled();
  });

  test('calls the ISBN lookup handler when the lookup button is clicked', async () => {
    mockDetailedIsbnSearch.mockResolvedValue({ found: false });

    renderBookForm();

    fireEvent.change(screen.getByRole('textbox', { name: translatedLabelMatcher('books:isbn') }), {
      target: { value: '9780140449136' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('books:isbn_lookup_button') }));

    await waitFor(() => {
      expect(mockDetailedIsbnSearch).toHaveBeenCalledWith('9780140449136');
    });
  });

  test('calls the ISBN lookup handler when Enter is pressed in the ISBN field', async () => {
    mockDetailedIsbnSearch.mockResolvedValue({ found: false });

    renderBookForm();

    const isbnInput = screen.getByRole('textbox', { name: translatedLabelMatcher('books:isbn') });

    fireEvent.change(isbnInput, { target: { value: '9780140449136' } });
    fireEvent.keyDown(isbnInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(mockDetailedIsbnSearch).toHaveBeenCalledWith('9780140449136');
    });
  });

  test('shows a loading indicator while ISBN lookup is in progress', async () => {
    mockDetailedIsbnSearch.mockImplementation(() => new Promise(() => undefined));

    renderBookForm();

    fireEvent.change(screen.getByRole('textbox', { name: translatedLabelMatcher('books:isbn') }), {
      target: { value: '9780140449136' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('books:isbn_lookup_button') }));

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });

  test('switches to edit mode and shows owned-book snackbar when ISBN matches a local book', async () => {
    mockDetailedIsbnSearch.mockResolvedValue({
      found: true,
      external: false,
      book: {
        id: 1,
        title: 'Iliad',
        isbnCode: '9780140449136',
        userId: 2,
        authors: [],
        categories: [],
      },
    });

    renderBookForm();

    fireEvent.change(screen.getByRole('textbox', { name: translatedLabelMatcher('books:isbn') }), {
      target: { value: '9780140449136' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('books:isbn_lookup_button') }));

    expect(await screen.findByText(t('books:isbn_owned_book_found'))).toBeInTheDocument();
    expect(screen.getByDisplayValue('Iliad')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('books:update_book') })).not.toBeDisabled();
  });

  test('unlocks the form and shows valid-ISBN snackbar when ISBN has no result', async () => {
    mockDetailedIsbnSearch.mockResolvedValue({ found: false });

    renderBookForm();

    fireEvent.change(screen.getByRole('textbox', { name: translatedLabelMatcher('books:isbn') }), {
      target: { value: '9780140449136' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('books:isbn_lookup_button') }));

    expect(await screen.findByText(t('books:isbn_valid_no_metadata'))).toBeInTheDocument();
    expect(screen.getByLabelText(translatedLabelMatcher('books:title'))).not.toBeDisabled();
    expect(screen.getByRole('button', { name: t('books:save_book') })).not.toBeDisabled();
  });

  test('shows validation error and does not call the API for invalid ISBN input', async () => {
    renderBookForm();

    fireEvent.change(screen.getByRole('textbox', { name: translatedLabelMatcher('books:isbn') }), {
      target: { value: 'NOT-AN-ISBN' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('books:isbn_lookup_button') }));

    expect(mockDetailedIsbnSearch).not.toHaveBeenCalled();
    expect(await screen.findByText(t('books:isbn_invalid'))).toBeInTheDocument();
    expect(screen.getByLabelText(translatedLabelMatcher('books:title'))).toBeDisabled();
  });

  test('updates and removes selected authors from manage dialog callbacks', () => {
    renderBookForm({
      book: {
        id: 10,
        title: 'Existing Book',
        isbnCode: '9781566199094',
        userId: 42,
        authors: [{ id: 999, name: 'Virginia', surname: 'Woolf', nationality: null }],
        categories: [],
      },
    });

    fireEvent.click(screen.getAllByRole('button', { name: /^manage$/i })[0]);
    expect(screen.getByTestId('manage-authors-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('manage-author-update'));
    expect(screen.getByText('Virginia WOOLF')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('manage-author-delete'));
    expect(screen.queryByText('Virginia WOOLF')).not.toBeInTheDocument();
    expect(screen.getByTestId('author-autocomplete-reload-trigger')).toHaveTextContent('2');
  });

  test('removes deleted category from selection and reloads categories after manage callback', () => {
    renderBookForm({
      book: {
        id: 10,
        title: 'Existing Book',
        isbnCode: '9781566199094',
        userId: 42,
        authors: [],
        categories: [
          { id: 123, name: 'Classics' },
          { id: 456, name: 'Poetry' },
        ],
      },
    });

    fireEvent.click(screen.getAllByRole('button', { name: /^manage$/i })[1]);
    expect(screen.getByTestId('manage-categories-dialog')).toBeInTheDocument();

    const callsBeforeDelete = mockLoadCategories.mock.calls.length;
    fireEvent.click(screen.getByTestId('manage-category-delete'));

    expect(mockLoadCategories.mock.calls.length).toBeGreaterThan(callsBeforeDelete);
  });

  test('opens embedded scanner from isbn field button without route navigation', () => {
    renderBookForm();

    fireEvent.click(screen.getByRole('button', { name: /scan isbn/i }));

    expect(screen.getByTestId('embedded-scanner-flow')).toBeInTheDocument();
  });

  test('shows isbn hint and applies numeric html input attributes', () => {
    renderBookForm();

    const isbnInput = screen.getByRole('textbox', { name: /isbn/i });

    expect(screen.getByText('Write the code without dashes or spaces')).toBeInTheDocument();
    expect(isbnInput).toHaveAttribute('inputmode', 'numeric');
    expect(isbnInput).toHaveAttribute('pattern', '[0-9]*');
  });

  test('hydrates add-book draft when initial draft arrives after mount', () => {
    const { rerender } = renderBookForm();

    expect(screen.getByLabelText(/title/i)).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /isbn/i })).toHaveValue('');

    rerender(
      <I18nextProvider i18n={testI18n}>
        <BookForm
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          onCancel={vi.fn()}
          initialDraft={{ title: 'Recovered draft title', notes: 'Recovered notes' }}
          initialIsbn="9789999999999"
        />
      </I18nextProvider>
    );

    expect(screen.getByLabelText(/title/i)).toHaveValue('Recovered draft title');
    expect(screen.getByRole('textbox', { name: /isbn/i })).toHaveValue('9789999999999');
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Recovered notes');
  });

  test('applies scanned isbn inline and shows duplicate warning (without copied notice) while preserving typed fields', async () => {
    mockSearchByISBN.mockResolvedValue({ id: 42, title: 'Existing book' });

    renderBookForm({
      initialDraft: {
        title: 'Typed title',
        notes: 'Typed notes',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /scan isbn/i }));
    fireEvent.click(screen.getByTestId('embedded-scan-success'));

    expect(await screen.findByText('A book with this ISBN already exists in your library.')).toBeInTheDocument();
    expect(screen.queryByText('ISBN copied')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('Typed title');
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Typed notes');
    expect(screen.getByRole('textbox', { name: /isbn/i })).toHaveValue('9781234567890');
  });

  test('reloads author autocomplete options after creating a new author', () => {
    renderBookForm({
      book: {
        id: 10,
        title: 'Existing Book',
        isbnCode: '9781566199094',
        userId: 42,
        authors: [],
        categories: [],
      },
    });

    expect(screen.getByTestId('author-autocomplete-reload-trigger')).toHaveTextContent('0');

    fireEvent.click(screen.getAllByRole('button', { name: /^Add$/i })[0]);
    expect(screen.getByTestId('add-author-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('create-author-success'));

    expect(screen.getByText('Virginia Woolf')).toBeInTheDocument();
    expect(screen.getByTestId('author-autocomplete-reload-trigger')).toHaveTextContent('1');
    expect(latestAuthorAutocompleteProps?.reloadTrigger).toBe(1);
  });

  test('passes existing book owner userId to author autocomplete in edit mode', () => {
    renderBookForm({
      book: {
        id: 10,
        title: 'Existing Book',
        isbnCode: '9781566199094',
        userId: 42,
        authors: [],
        categories: [],
      },
    });

    expect(latestAuthorAutocompleteProps?.userIdFilter).toBe(42);
  });
});
