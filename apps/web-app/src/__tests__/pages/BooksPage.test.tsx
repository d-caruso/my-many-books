import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import BooksPage from '../../pages/BooksPage';
import { ApiProvider } from '../../contexts/ApiContext';

const mockSetSearchParams = vi.fn();
let currentSearchParams: URLSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [currentSearchParams, mockSetSearchParams],
  useNavigate: () => vi.fn(),
}));

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
  BookList: ({ books, viewMode = 'grid', loading, error, onBookClick, onEdit, onDelete, onStatusChange, emptyMessage }: any) => (
    <div data-testid="book-list" data-view-mode={viewMode}>
      {error && <div data-testid="book-error">{error}</div>}
      {books.length === 0 && <div data-testid="empty-message">{emptyMessage}</div>}
      {books.map((book: any) => (
        <div key={book.id} data-testid={`book-item-${book.id}`}>
          <button data-testid={`select-${book.id}`} onClick={() => onBookClick?.(book)}>Select {book.title}</button>
          <button data-testid={`edit-${book.id}`} onClick={() => onEdit?.(book)}>Edit {book.title}</button>
          <button data-testid={`delete-${book.id}`} onClick={() => onDelete?.(book.id)}>Delete {book.title}</button>
          <button data-testid={`status-${book.id}`} onClick={() => onStatusChange?.(book.id, 'read')}>Status</button>
        </div>
      ))}
      {loading && <div data-testid="book-loading">Loading</div>}
    </div>
  ),
  BookForm: ({ book, onSubmit, onCancel, loading }: any) => (
    <div data-testid="book-form" data-book-id={book?.id ?? 'new'} data-loading={loading}>
      <button data-testid="form-submit" onClick={() => onSubmit({ title: 'Form Book', isbn: '123', selectedAuthors: [], selectedCategories: [] })}>
        Submit
      </button>
      <button data-testid="form-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
  BookDetails: ({ book, onEdit, onDelete, onClose }: any) => (
    <div data-testid="book-details">
      <div data-testid="details-title">{book?.title}</div>
      <button data-testid="details-edit" onClick={() => onEdit?.(book)}>
        Edit
      </button>
      <button data-testid="details-delete" onClick={() => onDelete?.(book.id)}>
        Delete
      </button>
      <button data-testid="details-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

vi.mock('../../components/Search', () => ({
  BookSearchForm: ({ onSearch, loading, initialQuery }: any) => (
    <div data-testid="search-form" data-loading={loading} data-initial-query={initialQuery}>
      <button data-testid="search-button" onClick={() => onSearch(initialQuery || 'query', { categoryId: 2 })}>
        Search
      </button>
    </div>
  ),
  BookSearchResults: ({ books }: any) => <div data-testid="search-results">{books.length} results</div>,
}));

const mockApiService = {
  getBooks: vi.fn(),
} as any;

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
        <BooksPage />
      </ApiProvider>
    </I18nextProvider>
  );

describe('BooksPage', () => {
  beforeAll(async () => {
    await i18nReady;
  });

  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
    mockSetSearchParams.mockClear();
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

  test('opens and cancels add book form', () => {
    renderBooksPage();
    fireEvent.click(screen.getByRole('button', { name: /add book/i }));
    expect(screen.getByTestId('book-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('form-cancel'));
    expect(screen.getByTestId('book-list')).toBeInTheDocument();
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

  test('performs search and updates params', () => {
    renderBooksPage();
    fireEvent.click(screen.getByTestId('search-button'));
    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams));
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

  test('opens add mode when mode=add param is provided', () => {
    currentSearchParams = new URLSearchParams([['mode', 'add']]);
    renderBooksPage();
    expect(screen.getByTestId('book-form')).toBeInTheDocument();
    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams), { replace: true });
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

  test('handles selecting a book to open details', () => {
    renderBooksPage();
    fireEvent.click(screen.getByTestId('select-10'));
    expect(screen.getByTestId('book-details')).toBeInTheDocument();
  });

  test('handles editing a book from details', () => {
    renderBooksPage();
    fireEvent.click(screen.getByTestId('select-10'));
    fireEvent.click(screen.getByTestId('details-edit'));
    expect(screen.getByTestId('book-form')).toBeInTheDocument();
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
