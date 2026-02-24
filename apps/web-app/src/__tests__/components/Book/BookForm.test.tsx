import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { BookForm } from '../../../components/Book/BookForm';

const mockSearchByISBN = vi.fn();
const mockLoadCategories = vi.fn();
let latestAuthorAutocompleteProps: any = null;

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
  AuthorAutocomplete: (props: any) => {
    latestAuthorAutocompleteProps = props;
    return (
      <div data-testid="author-autocomplete">
        <div data-testid="author-autocomplete-reload-trigger">{String(props.reloadTrigger ?? 0)}</div>
      </div>
    );
  },
}));

vi.mock('../../../components/Author/AddAuthorDialog', () => ({
  AddAuthorDialog: ({ open, onAuthorCreated, onClose }: any) =>
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
  ManageAuthorsDialog: ({ open, onAuthorUpdated, onAuthorDeleted }: any) =>
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
  ManageCategoriesDialog: ({ open, onCategoryDeleted }: any) =>
    open ? (
      <div data-testid="manage-categories-dialog">
        <button data-testid="manage-category-delete" onClick={() => onCategoryDeleted?.(123)}>
          Delete category
        </button>
      </div>
    ) : null,
}));

vi.mock('../../../components/Scanner/EmbeddedScannerFlow', () => ({
  EmbeddedScannerFlow: ({ isOpen, onClose, onScanSuccess }: any) =>
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

const renderBookForm = (props: Partial<React.ComponentProps<typeof BookForm>> = {}) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <BookForm onSubmit={vi.fn().mockResolvedValue(undefined)} onCancel={vi.fn()} {...props} />
    </I18nextProvider>
  );

describe('BookForm', () => {
  beforeAll(async () => {
    await i18nReady;
  });

  beforeEach(() => {
    mockSearchByISBN.mockReset();
    mockLoadCategories.mockReset();
    latestAuthorAutocompleteProps = null;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  test('updates and removes selected authors from manage dialog callbacks', () => {
    renderBookForm({
      initialDraft: {
        selectedAuthors: [{ id: 999, name: 'Virginia', surname: 'Woolf', nationality: null }],
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
      initialDraft: {
        selectedCategories: [123, 456],
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

    renderBookForm();

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Typed title' } });
    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Typed notes' } });
    fireEvent.click(screen.getByRole('button', { name: /scan isbn/i }));
    fireEvent.click(screen.getByTestId('embedded-scan-success'));

    expect(await screen.findByText('A book with this ISBN already exists in your library.')).toBeInTheDocument();
    expect(screen.queryByText('ISBN copied')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('Typed title');
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Typed notes');
    expect(screen.getByRole('textbox', { name: /isbn/i })).toHaveValue('9781234567890');
  });

  test('reloads author autocomplete options after creating a new author', () => {
    renderBookForm();

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
      } as any,
    });

    expect(latestAuthorAutocompleteProps?.userIdFilter).toBe(42);
  });
});
