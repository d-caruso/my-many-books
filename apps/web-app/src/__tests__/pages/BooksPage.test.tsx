import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import BooksPage from '../../pages/BooksPage';
import { ApiProvider } from '../../contexts/ApiContext';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { ADD_BOOK_SCANNER_DRAFT_STORAGE_KEY } from '../../constants/scanner';
import { useAuth } from '@my-many-books/shared-auth';
import {
  POST_LOGIN_WELCOME_STORAGE_KEY,
  SEARCH_SORT_BY_FIELDS,
  SORT_DIRECTIONS,
} from '@my-many-books/shared-types';
import type { ApiService } from '../../services/api';
import type { SettingsApi } from '@my-many-books/shared-api';
import type { Book } from '../../types';

const mockSetSearchParams = vi.fn();
const mockNavigate = vi.fn();
let currentSearchParams: URLSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [currentSearchParams, mockSetSearchParams],
  useNavigate: () => mockNavigate,
}));

vi.mock('@my-many-books/shared-auth', async () => {
  const actual = await vi.importActual<typeof import('@my-many-books/shared-auth')>('@my-many-books/shared-auth');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

const createBookSearchState = () => ({
  books: [
    { id: 1, title: 'Search Book 1', isbn: '123' },
    { id: 2, title: 'Search Book 2', isbn: '456' },
  ],
  loading: false,
  error: null,
  totalCount: 2,
  hasMore: false,
  searchBooks: vi.fn(),
  loadMore: vi.fn(),
  clearSearch: vi.fn(),
});

const createBooksState = () => ({
  books: [
    { id: 10, title: 'Library Book 1', isbn: '789' },
    { id: 11, title: 'Library Book 2', isbn: '012' },
  ],
  loading: false,
  error: null,
  totalCount: 2,
  hasMore: false,
  loadBooks: vi.fn().mockResolvedValue(undefined),
  loadMore: vi.fn().mockResolvedValue(undefined),
  createBook: vi.fn().mockResolvedValue({ id: 20 }),
  updateBook: vi.fn().mockResolvedValue({ id: 10 }),
  deleteBook: vi.fn().mockResolvedValue(true),
  updateBookStatus: vi.fn().mockResolvedValue({ id: 10, status: 'read' }),
  refreshBooks: vi.fn().mockResolvedValue(undefined),
});

let bookSearchState = createBookSearchState();
let booksState = createBooksState();

vi.mock('../../hooks/useBookSearch', () => ({
  useBookSearch: () => bookSearchState,
}));

vi.mock('../../hooks/useBooks', () => ({
  useBooks: () => booksState,
}));

vi.mock('../../components/Book', () => ({
  BookList: ({ books, viewMode = 'grid', loading, error, onBookClick, onEdit, onDelete, onStatusChange, emptyMessage }: {
    books: Book[];
    viewMode?: string;
    loading?: boolean;
    error?: string | null;
    onBookClick?: (book: Book) => void;
    onEdit?: (book: Book) => void;
    onDelete?: (id: number) => void;
    onStatusChange?: (id: number, status: string) => void;
    emptyMessage?: string;
  }) => (
    <div data-testid="book-list" data-view-mode={viewMode}>
      {error && <div data-testid="book-error">{error}</div>}
      {books.length === 0 && <div data-testid="empty-message">{emptyMessage}</div>}
      {books.map((book) => (
        <div key={book.id} data-testid={`book-item-${book.id}`}>
          <button data-testid={`select-${book.id}`} onClick={() => onBookClick?.(book)}>Select {book.title}</button>
          <button data-testid={`edit-${book.id}`} onClick={() => onEdit?.(book)}>Edit {book.title}</button>
          <button data-testid={`delete-${book.id}`} onClick={() => onDelete?.(book.id ?? 0)}>Delete {book.title}</button>
          <button data-testid={`status-${book.id}`} onClick={() => onStatusChange?.(book.id ?? 0, 'read')}>Status</button>
        </div>
      ))}
      {loading && <div data-testid="book-loading">Loading</div>}
    </div>
  ),
  BookForm: ({ book, onSubmit, onCancel, onResolvedLocalBook, loading, scannerPrefillNotice, initialDraft, initialIsbn }: {
    book?: Book | null;
    onSubmit: (data: unknown) => void;
    onCancel: () => void;
    onResolvedLocalBook?: (book: Book) => void;
    onIsbnSearch?: (isbn: string) => Promise<unknown>;
    loading?: boolean;
    scannerPrefillNotice?: string;
    initialDraft?: { title?: string; isbnCode?: string };
    initialIsbn?: string;
  }) => (
    <div
      data-testid="book-form"
      data-book-id={book?.id ?? 'new'}
      data-loading={loading}
      data-scanner-notice={scannerPrefillNotice ?? ''}
      data-initial-draft-title={initialDraft?.title ?? ''}
      data-initial-draft-isbn={initialDraft?.isbnCode ?? ''}
      data-initial-isbn={initialIsbn ?? ''}
    >
      <button
        data-testid="resolve-local-book"
        onClick={() =>
          onResolvedLocalBook?.({
            id: 77,
            title: 'Owned Book',
            isbnCode: '9780140449136',
            userId: 1,
            authors: [],
            categories: [],
          })
        }
      >
        Resolve local book
      </button>
      <button data-testid="form-submit" onClick={() => onSubmit({ title: 'Form Book', isbn: '123', selectedAuthors: [], selectedCategories: [] })}>
        Submit
      </button>
      <button data-testid="form-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
  BookDetails: ({ book, onEdit, onDelete, onClose }: {
    book?: Book | null;
    onEdit?: (book: Book) => void;
    onDelete?: (id: number) => void;
    onClose?: () => void;
  }) => (
    <div data-testid="book-details">
      <div data-testid="details-title">{book?.title}</div>
      <button data-testid="details-edit" onClick={() => onEdit?.(book as Book)}>
        Edit
      </button>
      <button data-testid="details-delete" onClick={() => onDelete?.(book?.id ?? 0)}>
        Delete
      </button>
      <button data-testid="details-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

vi.mock('../../components/Search', () => ({
  BookSearchForm: ({
    onSearch,
    loading,
    initialQuery,
    initialFilters,
  }: {
    onSearch: (q: string, f: Record<string, unknown>) => void;
    loading?: boolean;
    initialQuery?: string;
    initialFilters?: Record<string, unknown>;
  }) => (
    <div
      data-testid="search-form"
      data-loading={loading}
      data-initial-query={initialQuery}
      data-initial-filters={JSON.stringify(initialFilters ?? {})}
    >
      <button data-testid="search-button" onClick={() => onSearch(initialQuery || 'query', { categoryId: 2 })}>
        Search
      </button>
      <button
        data-testid="sorted-search-button"
        onClick={() =>
          onSearch(initialQuery || 'query', {
            sortBy: SEARCH_SORT_BY_FIELDS.AUTHOR,
            sortOrder: SORT_DIRECTIONS.DESC,
            status: 'finished',
          })
        }
      >
        Search Sorted
      </button>
    </div>
  ),
  BookSearchResults: ({ books }: { books: Book[] }) => <div data-testid="search-results">{books.length} results</div>,
}));

const mockApiService = {
  getBooks: vi.fn(),
  searchByIsbnDetailed: vi.fn().mockResolvedValue({ found: false }),
  baseURL: 'http://localhost:3000',
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
} as unknown as ApiService;

const mockSettingsApi = {
  getSettings: vi.fn().mockResolvedValue([
    {
      key: 'books.list.status.onchange',
      value: '"remove"',
      category: 'ui',
      type: 'enum',
      defaultValue: '"remove"',
      description: 'Behavior when book status changes',
      active: true,
      deleted: false,
      creationDate: new Date().toISOString(),
    }
  ]),
  getAllSettingsAdmin: vi.fn().mockResolvedValue([]),
  updateSetting: vi.fn(),
} as unknown as SettingsApi;

const testI18n = i18n.createInstance();
const i18nReady = testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['pages'],
  defaultNS: 'pages',
  resources: {
    en: {
      pages: {
        books: {
          title: 'My Books',
          description: 'Your personal book collection',
          description_with_count_one: '{{count}} book in your library',
          description_with_count_other: '{{count}} books in your library',
          books_found: '{{count}} books found',
          clear_search: 'Clear search',
          add_book: 'Add book',
          add: 'Add',
          scan_isbn: 'Scan ISBN',
          grid_view: 'Grid view',
          list_view: 'List view',
          loading: 'Loading books...',
          no_books_search: 'No books match your search',
          no_books_empty: 'No books yet',
          load_more: 'Load more',
        },
      },
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

const renderBooksPage = () =>
  render(
    <I18nextProvider i18n={testI18n}>
      <ApiProvider apiService={mockApiService}>
        <SettingsProvider settingsApi={mockSettingsApi}>
          <BooksPage />
        </SettingsProvider>
      </ApiProvider>
    </I18nextProvider>
  );

const t = (key: string, options?: Record<string, unknown>) => testI18n.t(key, options);

describe('BooksPage', () => {
  const mockUseAuth = vi.mocked(useAuth);

  beforeAll(async () => {
    await i18nReady;
  });

  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
    mockSetSearchParams.mockClear();
    mockNavigate.mockClear();
    window.sessionStorage.clear();
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Mario', surname: 'Rossi', email: 'mario@example.com', role: 'user' as const, isActive: true },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      refreshUser: vi.fn(),
      isAuthenticated: true,
    });
    bookSearchState = createBookSearchState();
    booksState = createBooksState();
  });

  test('renders books page in list mode by default', () => {
    renderBooksPage();
    expect(screen.getByTestId('book-list')).toBeInTheDocument();
    expect(screen.getByTestId('search-form')).toBeInTheDocument();
  });

  test('switches to grid view mode', () => {
    renderBooksPage();
    const gridButton = screen.getByRole('button', { name: /grid view/i });
    fireEvent.click(gridButton);
    expect(screen.getByTestId('book-list')).toHaveAttribute('data-view-mode', 'grid');
  });

  test('switches to list view mode', () => {
    renderBooksPage();
    const listButton = screen.getByRole('button', { name: /list view/i });
    fireEvent.click(listButton);
    expect(screen.getByTestId('book-list')).toHaveAttribute('data-view-mode', 'list');
  });

  test('opens and cancels add book form', async () => {
    renderBooksPage();
    fireEvent.click(screen.getByRole('button', { name: t('pages:books.add_book') }));
    await waitFor(() => expect(screen.getByTestId('book-form')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('form-cancel'));
    await waitFor(() => expect(screen.getByTestId('book-list')).toBeInTheDocument());
  });

  test('switches add flow to update flow when the form resolves a local ISBN hit', async () => {
    renderBooksPage();

    fireEvent.click(screen.getByRole('button', { name: t('pages:books.add_book') }));
    await waitFor(() => expect(screen.getByTestId('book-form')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('resolve-local-book'));

    await waitFor(() => expect(screen.getByTestId('book-form')).toHaveAttribute('data-book-id', '77'));

    fireEvent.click(screen.getByTestId('form-submit'));

    await waitFor(() => {
      expect(booksState.updateBook).toHaveBeenCalledWith(
        77,
        expect.objectContaining({ title: 'Form Book' })
      );
    });
    expect(booksState.createBook).not.toHaveBeenCalled();
  });

  test('navigates to scanner when scan isbn button is clicked', async () => {
    renderBooksPage();
    fireEvent.click(screen.getByRole('button', { name: /scan isbn/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/scanner'));
  });

  test('renders book list items when library data is available', () => {
    renderBooksPage();
    expect(screen.getByText('Select Library Book 1')).toBeInTheDocument();
    expect(screen.getByText('Select Library Book 2')).toBeInTheDocument();
  });

  test('displays total count in heading', () => {
    renderBooksPage();
    expect(screen.getByText('2 books in your library')).toBeInTheDocument();
  });

  test('shows one-time welcome snackbar after login handoff marker', () => {
    window.sessionStorage.setItem(POST_LOGIN_WELCOME_STORAGE_KEY, '1');

    renderBooksPage();

    expect(screen.getByText('Hello Mario')).toBeInTheDocument();
    expect(window.sessionStorage.getItem(POST_LOGIN_WELCOME_STORAGE_KEY)).toBeNull();
  });

  test('performs search and updates params', () => {
    renderBooksPage();
    fireEvent.click(screen.getByTestId('search-button'));
    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams));
  });

  test('writes sortBy and sortOrder query params for sorted searches', () => {
    renderBooksPage();

    fireEvent.click(screen.getByTestId('sorted-search-button'));

    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams));
    const params = mockSetSearchParams.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(params.get('q')).toBe('query');
    expect(params.get('sortBy')).toBe(SEARCH_SORT_BY_FIELDS.AUTHOR);
    expect(params.get('sortOrder')).toBe(SORT_DIRECTIONS.DESC);
    expect(params.get('status')).toBe('finished');
  });

  test('clears search chip resets params and results', () => {
    currentSearchParams = new URLSearchParams([['q', 'history']]);
    renderBooksPage();
    fireEvent.click(screen.getByText('Clear search'));
    expect(mockSetSearchParams).toHaveBeenCalledWith({});
    expect(bookSearchState.clearSearch).toHaveBeenCalled();
  });

  test('loads user books when there is no active search', () => {
    renderBooksPage();
    expect(booksState.loadBooks).toHaveBeenCalledWith(1);
  });

  test('runs search when query param is present', () => {
    currentSearchParams = new URLSearchParams([['q', 'sci-fi']]);
    renderBooksPage();
    expect(bookSearchState.searchBooks).toHaveBeenCalledWith('sci-fi', {});
  });

  test('runs search when filters exist', () => {
    currentSearchParams = new URLSearchParams([
      ['categoryId', '3'],
      ['authorId', '9'],
      ['sortBy', 'title'],
    ]);
    renderBooksPage();
    expect(bookSearchState.searchBooks).toHaveBeenCalledWith('', {
      categoryId: 3,
      authorId: 9,
      sortBy: 'title',
    });
  });

  test('passes URL-derived initial filters to BookSearchForm', () => {
    currentSearchParams = new URLSearchParams([
      ['q', 'history'],
      ['sortBy', SEARCH_SORT_BY_FIELDS.STATUS],
      ['sortOrder', SORT_DIRECTIONS.DESC],
      ['status', 'finished'],
    ]);

    renderBooksPage();

    const searchForm = screen.getByTestId('search-form');
    expect(searchForm).toHaveAttribute('data-initial-query', 'history');
    expect(searchForm).toHaveAttribute(
      'data-initial-filters',
      JSON.stringify({
        sortBy: SEARCH_SORT_BY_FIELDS.STATUS,
        sortOrder: SORT_DIRECTIONS.DESC,
        status: 'finished',
      })
    );
  });

  test.each([
    [SEARCH_SORT_BY_FIELDS.CREATION_DATE, SORT_DIRECTIONS.DESC],
    [SEARCH_SORT_BY_FIELDS.UPDATE_DATE, SORT_DIRECTIONS.ASC],
    [SEARCH_SORT_BY_FIELDS.STATUS, SORT_DIRECTIONS.DESC],
    [SEARCH_SORT_BY_FIELDS.AUTHOR, SORT_DIRECTIONS.ASC],
  ])(
    'runs search with %s and %s from URL params',
    (sortBy, sortOrder) => {
      currentSearchParams = new URLSearchParams([
        ['q', 'history'],
        ['sortBy', sortBy],
        ['sortOrder', sortOrder],
      ]);

      renderBooksPage();

      expect(bookSearchState.searchBooks).toHaveBeenCalledWith('history', {
        sortBy,
        sortOrder,
      });
    }
  );

  test('opens add mode when mode=add param is provided', async () => {
    currentSearchParams = new URLSearchParams([['mode', 'add']]);
    renderBooksPage();
    await waitFor(() => expect(screen.getByTestId('book-form')).toBeInTheDocument());
    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams), { replace: true });
  });

  test('shows scanner feedback and clears scanner params in add mode', async () => {
    currentSearchParams = new URLSearchParams([
      ['mode', 'add'],
      ['isbn', '9780000000000'],
      ['scannerSource', 'scanner'],
      ['scannerCopy', 'success'],
    ]);

    renderBooksPage();

    await waitFor(() => expect(screen.getByTestId('book-form')).toBeInTheDocument());
    expect(screen.getByTestId('book-form')).toHaveAttribute('data-scanner-notice', 'ISBN copied');

    const replaceCall = mockSetSearchParams.mock.calls.find(
      (call) => call[1]?.replace === true
    );
    expect(replaceCall).toBeDefined();
    const updatedParams = replaceCall?.[0] as URLSearchParams;
    expect(updatedParams.get('scannerSource')).toBeNull();
    expect(updatedParams.get('scannerCopy')).toBeNull();
  });

  test('preserves add-book draft on scanner success and overrides isbn with scanned value', async () => {
    window.sessionStorage.setItem(
      ADD_BOOK_SCANNER_DRAFT_STORAGE_KEY,
      JSON.stringify({
        title: 'Typed before scan',
        isbnCode: 'old-isbn',
        notes: 'Keep this note',
      })
    );

    currentSearchParams = new URLSearchParams([
      ['mode', 'add'],
      ['isbn', '9780000000000'],
      ['scannerSource', 'scanner'],
      ['scannerCopy', 'success'],
    ]);

    renderBooksPage();

    await waitFor(() => expect(screen.getByTestId('book-form')).toBeInTheDocument());
    const form = screen.getByTestId('book-form');
    expect(form).toHaveAttribute('data-initial-draft-title', 'Typed before scan');
    expect(form).toHaveAttribute('data-initial-draft-isbn', 'old-isbn');
    expect(form).toHaveAttribute('data-initial-isbn', '9780000000000');
    expect(window.sessionStorage.getItem(ADD_BOOK_SCANNER_DRAFT_STORAGE_KEY)).toBeNull();
  });

  test('restores add-book draft after closing scanner and clears restore state', async () => {
    window.sessionStorage.setItem(
      ADD_BOOK_SCANNER_DRAFT_STORAGE_KEY,
      JSON.stringify({
        title: 'Draft from scanner flow',
        isbnCode: '9781111111111',
        notes: 'Draft notes',
      })
    );

    currentSearchParams = new URLSearchParams([
      ['mode', 'add'],
      ['restoreDraft', '1'],
    ]);

    renderBooksPage();

    await waitFor(() => expect(screen.getByTestId('book-form')).toBeInTheDocument());
    const form = screen.getByTestId('book-form');
    expect(form).toHaveAttribute('data-initial-draft-title', 'Draft from scanner flow');
    expect(form).toHaveAttribute('data-initial-draft-isbn', '9781111111111');
    expect(window.sessionStorage.getItem(ADD_BOOK_SCANNER_DRAFT_STORAGE_KEY)).toBeNull();

    const replaceCall = mockSetSearchParams.mock.calls.find(
      (call) => call[1]?.replace === true
    );
    expect(replaceCall).toBeDefined();
    const updatedParams = replaceCall?.[0] as URLSearchParams;
    expect(updatedParams.get('restoreDraft')).toBeNull();
  });

  test('handles load more button when there are more results', () => {
    booksState.hasMore = true;
    renderBooksPage();
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));
    expect(booksState.loadMore).toHaveBeenCalled();
  });

  test('shows search results count when search active', () => {
    currentSearchParams = new URLSearchParams([['q', 'fiction']]);
    renderBooksPage();
    expect(screen.getByText(/books found/i)).toBeInTheDocument();
  });

  test('handles selecting a book to open details', async () => {
    renderBooksPage();
    fireEvent.click(screen.getByTestId('select-10'));
    await waitFor(() => expect(screen.getByTestId('book-details')).toBeInTheDocument());
  });

  test('handles editing a book from details', async () => {
    renderBooksPage();
    fireEvent.click(screen.getByTestId('select-10'));
    await waitFor(() => expect(screen.getByTestId('book-details')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('details-edit'));
    await waitFor(() => expect(screen.getByTestId('book-form')).toBeInTheDocument());
    expect(screen.getByTestId('book-form')).toHaveAttribute('data-book-id', '10');
  });

  test('handles deleting a book and refreshing library', async () => {
    renderBooksPage();
    await act(async () => {
      fireEvent.click(screen.getByTestId('delete-10'));
    });
    expect(booksState.deleteBook).toHaveBeenCalledWith(10);
    expect(booksState.refreshBooks).toHaveBeenCalled();
  });

  test('handles status change action', async () => {
    renderBooksPage();
    await act(async () => {
      fireEvent.click(screen.getByTestId('status-10'));
    });
    expect(booksState.updateBookStatus).toHaveBeenCalledWith(10, 'read');
  });

  test('shows empty message when no books present', () => {
    booksState.books = [];
    booksState.totalCount = 0;
    renderBooksPage();
    expect(screen.getByTestId('empty-message')).toHaveTextContent('No books yet');
  });
});
