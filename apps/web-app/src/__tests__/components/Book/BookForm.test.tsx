import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { BookForm } from '../../../components/Book/BookForm';

const mockSearchByISBN = vi.fn();

vi.mock('../../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [],
    loading: false,
    loadCategories: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useBookSearch', () => ({
  useBookSearch: () => ({
    searchByISBN: mockSearchByISBN,
  }),
}));

vi.mock('../../../components/Search/AuthorAutocomplete', () => ({
  AuthorAutocomplete: () => <div data-testid="author-autocomplete" />,
}));

vi.mock('../../../components/Author/AddAuthorDialog', () => ({
  AddAuthorDialog: () => null,
}));

vi.mock('../../../components/Category/AddCategoryDialog', () => ({
  AddCategoryDialog: () => null,
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
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  test('opens embedded scanner from isbn field button without route navigation', () => {
    renderBookForm();

    fireEvent.click(screen.getByRole('button', { name: /scan isbn/i }));

    expect(screen.getByTestId('embedded-scanner-flow')).toBeInTheDocument();
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
});
