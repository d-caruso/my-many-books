import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  SEARCH_SORT_BY_FIELDS,
  SORT_DIRECTIONS,
} from '@my-many-books/shared-types';
import { Book } from '../../../types';

// Import after mocks
import { MemoryRouter } from 'react-router-dom';
import BookSearchPage from '../../../components/Search/BookSearchPage';
import { useBookSearch } from '../../../hooks/useBookSearch';
import { setupMuiMock } from '../../test-utils/setupMuiMock';


const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();
let currentSearchParams = new URLSearchParams();

// Mock react-router-dom BEFORE importing anything that uses it
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [
    currentSearchParams,
    mockSetSearchParams,
  ],
}));

// Mock the useBookSearch hook
vi.mock('../../../hooks/useBookSearch', () => ({
  useBookSearch: vi.fn(),
}));

// Mock child components
vi.mock('../../../components/Search/BookSearchForm', () => ({
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
      data-testid="book-search-form"
      data-initial-query={initialQuery ?? ''}
      data-initial-filters={JSON.stringify(initialFilters ?? {})}
    >
      <input
        data-testid="search-input"
        defaultValue={initialQuery}
        onChange={(e) => onSearch(e.target.value, {})}
      />
      <button data-testid="search-button" disabled={loading} onClick={() => onSearch(initialQuery ?? '', {})}>
        Search
      </button>
      <button
        data-testid="search-created-desc"
        onClick={() =>
          onSearch('sorted query', {
            sortBy: SEARCH_SORT_BY_FIELDS.CREATED_AT,
            sortOrder: SORT_DIRECTIONS.DESC,
          })
        }
      >
        Search Created Desc
      </button>
    </div>
  ),
}));

vi.mock('../../../components/Search/BookSearchResults', () => ({
  BookSearchResults: ({
    books,
    loading,
    error,
    totalCount,
    hasMore,
    onLoadMore,
    onBookSelect,
  }: {
    books: Book[];
    loading: boolean;
    error: string | null;
    totalCount: number;
    hasMore: boolean;
    onLoadMore: () => void;
    onBookSelect: (book: Book) => void;
  }) => (
    <div data-testid="book-search-results">
      <div data-testid="results-count">{books.length}</div>
      <div data-testid="total-count">{totalCount}</div>
      <div data-testid="loading-state">{loading.toString()}</div>
      <div data-testid="error-state">{error}</div>
      <div data-testid="has-more">{hasMore.toString()}</div>
      {books.map((book: Book) => (
        <div key={book.id} data-testid={`book-${book.id}`}>
          <button onClick={() => onBookSelect(book)}>
            {book.title}
          </button>
        </div>
      ))}
      {hasMore && (
        <button data-testid="load-more" onClick={onLoadMore}>
          Load More
        </button>
      )}
    </div>
  ),
}));

// Mock Material-UI components
setupMuiMock();

// Mock Material-UI icons
vi.mock('@mui/icons-material/Close', () => ({
  default: () => <div data-testid="close-icon">Close</div>,
}));

vi.mock('@mui/icons-material/Add', () => ({
  default: () => <div data-testid="add-icon">Add</div>,
}));

vi.mock('@mui/icons-material/Search', () => ({
  default: () => <div data-testid="search-icon">Search</div>,
}));

vi.mock('@mui/icons-material/MenuBook', () => ({
  default: () => <div data-testid="menu-book-icon">Book</div>,
}));

vi.mock('@mui/icons-material/Person', () => ({
  default: () => <div data-testid="person-icon">Person</div>,
}));

vi.mock('@mui/icons-material/FilterList', () => ({
  default: () => <div data-testid="filter-icon">Filter</div>,
}));

const mockUseBookSearch = vi.mocked(useBookSearch);

const mockBooks: Book[] = [
  {
    id: 1,
    title: 'Test Book 1',
    authors: [{ id: 1, name: 'Author', surname: 'One' }],
    isbnCode: '1234567890',
    status: 'finished',
    categories: [],
  },
  {
    id: 2,
    title: 'Test Book 2',
    authors: [{ id: 2, name: 'Author', surname: 'Two' }],
    isbnCode: '0987654321',
    status: 'reading',
    categories: [],
  },
];

describe('BookSearchPage', () => {
  const mockSearchBooks = vi.fn();
  const mockSearchByISBN = vi.fn();
  const mockClearSearch = vi.fn();
  const mockLoadMore = vi.fn();

  const defaultHookState = {
    books: [],
    loading: false,
    error: null,
    hasMore: false,
    totalCount: 0,
    searchBooks: mockSearchBooks,
    searchByISBN: mockSearchByISBN,
    clearSearch: mockClearSearch,
    loadMore: mockLoadMore,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    currentSearchParams = new URLSearchParams();
    mockUseBookSearch.mockReturnValue(defaultHookState);
  });

  const renderWithRouter = (searchParams = '') => {
    currentSearchParams = new URLSearchParams(searchParams.replace(/^\?/, ''));
    return render(
      <MemoryRouter initialEntries={[`/search${searchParams}`]}>
        <BookSearchPage />
      </MemoryRouter>
    );
  };

  test('renders search page with header and form', () => {
    renderWithRouter();

    expect(screen.getByRole('heading', { name: /search books/i })).toBeInTheDocument();
    expect(screen.getByText('Find books in your library or discover new ones to add')).toBeInTheDocument();
    expect(screen.getByTestId('book-search-form')).toBeInTheDocument();
  });

  test('renders empty state when no search performed', () => {
    renderWithRouter();

    expect(screen.getByRole('heading', { name: /search your library/i })).toBeInTheDocument();
    expect(screen.getByText('Use the search form above to find books in your collection, or discover new books to add to your library.')).toBeInTheDocument();
    expect(screen.getByText(/search by title/i)).toBeInTheDocument();
    expect(screen.getByText(/search by author/i)).toBeInTheDocument();
    expect(screen.getByText(/advanced filters/i)).toBeInTheDocument();
  });

  test('shows search results when books are present', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      books: mockBooks,
      totalCount: 2,
    });

    renderWithRouter();

    expect(screen.getByTestId('book-search-results')).toBeInTheDocument();
    expect(screen.getByTestId('results-count')).toHaveTextContent('2');
  });

  test('shows clear search button when books are present', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      books: mockBooks,
      totalCount: 2,
    });

    renderWithRouter();

    const clearButton = screen.getByText('Clear search');
    expect(clearButton).toBeInTheDocument();
    
    fireEvent.click(clearButton);
    expect(mockClearSearch).toHaveBeenCalledTimes(1);
  });

  test('shows add new book button when books are present', async () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      books: mockBooks,
      totalCount: 2,
    });

    renderWithRouter();

    const addButton = screen.getByRole('button', { name: /add new book/i });
    expect(addButton).toBeInTheDocument();
    
    fireEvent.click(addButton);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/?mode=add'));
  });

  test('handles search form submission', () => {
    renderWithRouter();

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    expect(mockSearchBooks).toHaveBeenCalledWith('test query', {});
  });

  test('writes sortBy and sortOrder to URL params on search submission', () => {
    renderWithRouter();

    fireEvent.click(screen.getByTestId('search-created-desc'));

    expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(URLSearchParams));
    const params = mockSetSearchParams.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(params.get('q')).toBe('sorted query');
    expect(params.get('sortBy')).toBe(SEARCH_SORT_BY_FIELDS.CREATED_AT);
    expect(params.get('sortOrder')).toBe(SORT_DIRECTIONS.DESC);
    expect(mockSearchBooks).toHaveBeenCalledWith('sorted query', {
      sortBy: SEARCH_SORT_BY_FIELDS.CREATED_AT,
      sortOrder: SORT_DIRECTIONS.DESC,
    });
  });

  test.each([
    [SEARCH_SORT_BY_FIELDS.CREATED_AT, SORT_DIRECTIONS.DESC],
    [SEARCH_SORT_BY_FIELDS.UPDATED_AT, SORT_DIRECTIONS.ASC],
    [SEARCH_SORT_BY_FIELDS.STATUS, SORT_DIRECTIONS.DESC],
    [SEARCH_SORT_BY_FIELDS.AUTHOR, SORT_DIRECTIONS.ASC],
  ])(
    'reads %s and %s from URL params into search filters',
    (sortBy, sortOrder) => {
      renderWithRouter(`?q=history&sortBy=${sortBy}&sortOrder=${sortOrder}`);

      expect(mockSearchBooks).toHaveBeenCalledWith('history', {
        sortBy,
        sortOrder,
      });
    }
  );

  test('handles book selection', async () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      books: mockBooks,
      totalCount: 2,
    });

    renderWithRouter();

    const bookButton = screen.getByText('Test Book 1');
    fireEvent.click(bookButton);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/books/1'));
  });

  test('passes loading state to search results', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      loading: true,
    });

    renderWithRouter();

    expect(screen.getByTestId('loading-state')).toHaveTextContent('true');
  });

  test('passes error state to search results', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      error: 'Search failed',
    });

    renderWithRouter();

    expect(screen.getByTestId('error-state')).toHaveTextContent('Search failed');
  });

  test('handles load more functionality', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      books: mockBooks,
      totalCount: 10,
      hasMore: true,
    });

    renderWithRouter();

    const loadMoreButton = screen.getByTestId('load-more');
    fireEvent.click(loadMoreButton);

    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  test('shows error state with clear button', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      error: 'Network error',
    });

    renderWithRouter();

    expect(screen.getByText('Clear search')).toBeInTheDocument();
    expect(screen.getByTestId('error-state')).toHaveTextContent('Network error');
  });

  test('does not show clear button when no books and no error', () => {
    renderWithRouter();

    expect(screen.queryByText('Clear search')).not.toBeInTheDocument();
  });

  test('shows empty state icons and content', () => {
    renderWithRouter();

    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    expect(screen.getByTestId('menu-book-icon')).toBeInTheDocument();
    expect(screen.getByTestId('person-icon')).toBeInTheDocument();
    expect(screen.getByTestId('filter-icon')).toBeInTheDocument();
  });

  // NOTE: Tests using vi.doMock for dynamic mocking are removed because they don't work
  // with Vitest's module hoisting. The functionality they tested (URL params handling)
  // is already covered by other tests that use the search form and clear button.

  test('passes correct props to BookSearchForm', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      loading: true,
    });

    renderWithRouter();

    const searchForm = screen.getByTestId('book-search-form');
    expect(searchForm).toBeInTheDocument();
    
    const searchButton = screen.getByTestId('search-button');
    expect(searchButton).toBeDisabled();
  });

  test('passes URL-derived initial filters to BookSearchForm', () => {
    renderWithRouter(
      `?q=history&sortBy=${SEARCH_SORT_BY_FIELDS.CREATED_AT}&sortOrder=${SORT_DIRECTIONS.DESC}&status=finished`
    );

    const searchForm = screen.getByTestId('book-search-form');
    expect(searchForm).toHaveAttribute('data-initial-query', 'history');
    expect(searchForm).toHaveAttribute(
      'data-initial-filters',
      JSON.stringify({
        sortBy: SEARCH_SORT_BY_FIELDS.CREATED_AT,
        sortOrder: SORT_DIRECTIONS.DESC,
        status: 'finished',
      })
    );
  });

  test('passes correct props to BookSearchResults', () => {
    mockUseBookSearch.mockReturnValue({
      ...defaultHookState,
      books: mockBooks,
      loading: false,
      error: 'test error',
      totalCount: 5,
      hasMore: true,
    });

    renderWithRouter();

    expect(screen.getByTestId('results-count')).toHaveTextContent('2');
    expect(screen.getByTestId('total-count')).toHaveTextContent('5');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
    expect(screen.getByTestId('error-state')).toHaveTextContent('test error');
    expect(screen.getByTestId('has-more')).toHaveTextContent('true');
  });

  test('handles component mount and unmount cleanly', () => {
    const { unmount } = renderWithRouter();

    expect(() => unmount()).not.toThrow();
  });

  test('redirects scanner-origin ISBN search to add view when no book is found', async () => {
    mockSearchByISBN.mockResolvedValueOnce(null);

    renderWithRouter('?isbn=9780000000000&scannerSource=scanner&scannerCopy=success');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/?mode=add&isbn=9780000000000&scannerSource=scanner&scannerCopy=success',
        { replace: true }
      );
    });
  });

  // NOTE: CSS/styling tests removed as they are brittle and depend on implementation details
  // The component's visual appearance is better tested through visual regression testing
});
